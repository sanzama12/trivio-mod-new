/**
 * PostgreSQL repositories cho các aggregate có cấu trúc thay đổi theo workflow.
 * Dữ liệu được lưu trong `trovio.app_documents`; không đọc/ghi filesystem và
 * không tự sinh dữ liệu mẫu. Các danh mục tuyển sinh lõi vẫn dùng bảng quan hệ.
 */
import { randomUUID, timingSafeEqual } from "node:crypto";
import { query, withTransaction } from "@database/client";
import { FUNNEL_EVENTS } from "@/domain/types";
import type {
  AnalyticsRepository,
  AuditRepository,
  ChatAliasRepository,
  ChatLogRepository,
  ChatQuotaRepository,
  ChatHistoryRepository,
  ChatHistoryUserRow,
  CommentRepository,
  ImportBatchRepository,
  NotificationRepository,
  PasswordResetCodeRepository,
  QaRepository,
  ShareRepository,
  SurveyRepository,
  SupplementaryRepository,
  UserDataRepository,
} from "./types";
import type {
  AppNotification,
  AuditEntry,
  ChatAlias,
  ChatLog,
  FunnelEvent,
  ImportBatch,
  QaQuestion,
  Share,
  ShareComment,
  SusResponse,
  SupplementaryRound,
  UserData,
} from "@/domain/types";
import type { ChatConversation } from "@/domain/chat";
import type { ChatQuotaRecord } from "@/domain/chat-quota";

export const postgresChatQuotaRepository: ChatQuotaRepository = {
  async get(subject, kind) {
    const rows = await query<DocumentRow<ChatQuotaRecord>>(
      "SELECT payload FROM trovio.app_documents WHERE collection = 'chat-quota' AND id = $1",
      [`${subject}:${kind}`],
    );
    return rows[0]?.payload ?? null;
  },
  async take(subject, kind, limit, resetsAt, now) {
    const rows = await query<DocumentRow<ChatQuotaRecord>>(
      `INSERT INTO trovio.app_documents AS current (collection, id, payload)
       VALUES ('chat-quota', $1, jsonb_build_object('used', 1, 'resetsAt', $2::text))
       ON CONFLICT (collection, id) DO UPDATE SET
         payload = CASE
           WHEN (current.payload->>'resetsAt')::timestamptz <= $3::timestamptz
             OR (current.payload->>'used')::int = 0 THEN EXCLUDED.payload
           ELSE jsonb_set(current.payload, '{used}', to_jsonb((current.payload->>'used')::int + 1))
         END,
         updated_at = now()
       WHERE (current.payload->>'resetsAt')::timestamptz <= $3::timestamptz
          OR (current.payload->>'used')::int < $4::int
       RETURNING payload`,
      [`${subject}:${kind}`, resetsAt, now, limit],
    );
    return rows[0]?.payload ?? null;
  },
  async refund(subject, kind, resetsAt) {
    await query(
      `UPDATE trovio.app_documents
       SET payload = jsonb_set(payload, '{used}', to_jsonb(GREATEST(0, (payload->>'used')::int - 1))), updated_at = now()
       WHERE collection = 'chat-quota' AND id = $1 AND payload->>'resetsAt' = $2 AND (payload->>'used')::int > 0`,
      [`${subject}:${kind}`, resetsAt],
    );
  },
};

interface DocumentRow<T> {
  payload: T;
}

interface DocumentIndex {
  ownerId?: string | null;
  parentId?: string | null;
  status?: string | null;
}

async function getDocument<T>(collection: string, id: string): Promise<T | null> {
  const rows = await query<DocumentRow<T>>(
    `SELECT payload FROM trovio.app_documents WHERE collection = $1 AND id = $2`,
    [collection, id],
  );
  return rows[0]?.payload ?? null;
}

async function listDocuments<T>(collection: string, where?: DocumentIndex, limit?: number): Promise<T[]> {
  const clauses = ["collection = $1"];
  const params: unknown[] = [collection];
  for (const [column, value] of [
    ["owner_id", where?.ownerId],
    ["parent_id", where?.parentId],
    ["status", where?.status],
  ] as const) {
    if (value === undefined) continue;
    params.push(value);
    clauses.push(value === null ? `${column} IS NULL` : `${column} = $${params.length}`);
    if (value === null) params.pop();
  }
  const safeLimit = limit == null ? 10_000 : Math.max(1, Math.min(10_000, Math.trunc(limit)));
  params.push(safeLimit);
  const rows = await query<DocumentRow<T>>(
    `SELECT payload FROM trovio.app_documents
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows.map((row) => row.payload);
}

async function putDocument<T extends object>(collection: string, id: string, payload: T, index: DocumentIndex = {}): Promise<T> {
  await query(
    `INSERT INTO trovio.app_documents (collection, id, owner_id, parent_id, status, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (collection, id) DO UPDATE SET
       owner_id = EXCLUDED.owner_id,
       parent_id = EXCLUDED.parent_id,
       status = EXCLUDED.status,
       payload = EXCLUDED.payload,
       updated_at = now()`,
    [collection, id, index.ownerId ?? null, index.parentId ?? null, index.status ?? null, JSON.stringify(payload)],
  );
  return structuredClone(payload);
}

async function deleteDocument(collection: string, id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM trovio.app_documents WHERE collection = $1 AND id = $2 RETURNING id`,
    [collection, id],
  );
  return rows.length > 0;
}

async function updateDocument<T extends object>(
  collection: string,
  id: string,
  patch: Partial<T> | ((current: T) => T),
  indexOf: (value: T) => DocumentIndex = () => ({}),
): Promise<T | null> {
  return withTransaction(async () => {
    const [row] = await query<DocumentRow<T>>(
      "SELECT payload FROM trovio.app_documents WHERE collection=$1 AND id=$2 FOR UPDATE", [collection,id]);
    if (!row) return null;
    const next = typeof patch === "function" ? patch(structuredClone(row.payload)) : { ...row.payload, ...patch };
    return putDocument(collection, id, next, indexOf(next));
  });
}

export const postgresUserDataRepository: UserDataRepository = {
  async compareAndSwap(userId, data, expectedUpdatedAt) {
    return withTransaction(async () => {
      await query("SELECT pg_advisory_xact_lock(hashtext($1))", [`user-data:${userId}`]);
      const current = await getDocument<UserData>("user-data", userId);
      if ((current?.updatedAt ?? new Date(0).toISOString()) !== expectedUpdatedAt) return null;
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt) + 1)).toISOString();
      return putDocument("user-data", userId, { ...data, updatedAt }, { ownerId: userId });
    });
  },
  get: (userId) => getDocument<UserData>("user-data", userId),
  put: (userId, data) => putDocument("user-data", userId, data, { ownerId: userId }),
  async delete(userId) {
    await deleteDocument("user-data", userId);
  },
};

interface PasswordResetCodeDocument {
  hash: string;
  expiresAt: string;
  attempts: number;
  issuedAt: string;
  windowStartedAt: string;
  issuedCount: number;
}

export const postgresPasswordResetCodeRepository: PasswordResetCodeRepository = {
  async save(userId, hash, expiresAt) {
    return withTransaction(async () => {
      await query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`password-reset-code:${userId}`]);
      const [row] = await query<DocumentRow<PasswordResetCodeDocument>>(
        `SELECT payload FROM trovio.app_documents WHERE collection='password-reset-code' AND id=$1 FOR UPDATE`, [userId]);
      const now = Date.now();
      const previous = row?.payload;
      if (previous && now - Date.parse(previous.issuedAt) < 60_000) return false;
      const inWindow = previous && now - Date.parse(previous.windowStartedAt) < 15 * 60_000;
      if (inWindow && previous.issuedCount >= 3) return false;
      const issuedAt = new Date(now).toISOString();
      await putDocument("password-reset-code", userId, {
        hash, expiresAt, attempts: 0, issuedAt,
        windowStartedAt: inWindow ? previous.windowStartedAt : issuedAt,
        issuedCount: inWindow ? previous.issuedCount + 1 : 1,
      }, { ownerId: userId });
      return true;
    });
  },
  async consume(userId, candidateHash) {
    return withTransaction(async () => {
      const [row] = await query<DocumentRow<PasswordResetCodeDocument>>(
        `SELECT payload FROM trovio.app_documents WHERE collection='password-reset-code' AND id=$1 FOR UPDATE`, [userId]);
      if (!row) return false;
      const current = row.payload;
      if (Date.parse(current.expiresAt) <= Date.now() || current.attempts >= 5 || !current.hash) return false;
      const expected = Buffer.from(current.hash);
      const actual = Buffer.from(candidateHash);
      if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
        await putDocument("password-reset-code", userId, { ...current, hash: "", attempts: 5 }, { ownerId: userId });
        return true;
      }
      await putDocument("password-reset-code", userId, current.attempts + 1 >= 5
        ? { ...current, hash: "", attempts: 5 }
        : { ...current, attempts: current.attempts + 1 }, { ownerId: userId });
      return false;
    });
  },
  async revoke(userId, expectedHash) {
    if (expectedHash) {
      await query(`DELETE FROM trovio.app_documents WHERE collection='password-reset-code' AND id=$1 AND payload->>'hash'=$2`, [userId, expectedHash]);
    } else await deleteDocument("password-reset-code", userId);
  },
};

export const postgresShareRepository: ShareRepository = {
  create: (share) => putDocument("share", share.id, share, { ownerId: share.userId }),
  findById: (id) => getDocument<Share>("share", id),
  listByUser: (userId) => listDocuments<Share>("share", { ownerId: userId }),
  update: (id, patch) => updateDocument<Share>("share", id, patch, (value) => ({ ownerId: value.userId })),
};

export const postgresCommentRepository: CommentRepository = {
  add: (comment) => putDocument("share-comment", comment.id, comment, { ownerId: comment.ownerId, parentId: comment.shareId }),
  listByOwner: (ownerId) => listDocuments<ShareComment>("share-comment", { ownerId }),
  async countByShare(shareId) {
    return Number((await query<{ count: string }>(
      "SELECT count(*) FROM trovio.app_documents WHERE collection='share-comment' AND parent_id=$1", [shareId]))[0].count);
  },
  async delete(id, ownerId) {
    const current = await getDocument<ShareComment>("share-comment", id);
    return current?.ownerId === ownerId ? deleteDocument("share-comment", id) : false;
  },
  async markAllRead(ownerId) {
    for (const item of await listDocuments<ShareComment>("share-comment", { ownerId })) {
      if (!item.read) await putDocument("share-comment", item.id, { ...item, read: true }, { ownerId, parentId: item.shareId });
    }
  },
};

export const postgresAuditRepository: AuditRepository = {
  append: (entry) => putDocument("audit", entry.id, entry, { ownerId: entry.actorId, parentId: entry.programId, status: entry.targetType ?? "program" }).then(() => undefined),
  async list(limit = 50, filter) {
    const rows = await listDocuments<AuditEntry>("audit", { parentId: filter?.targetId, status: filter?.targetType }, limit);
    return rows;
  },
};

export const postgresChatLogRepository: ChatLogRepository = {
  add: (log) => putDocument("chat-log", log.id, log, { status: log.kind }).then(() => undefined),
  async setHelpful(id, helpful) {
    return !!(await updateDocument<ChatLog>("chat-log", id, { helpful }, (value) => ({ status: value.kind })));
  },
  list: (limit = 200) => listDocuments<ChatLog>("chat-log", undefined, limit),
};

export const postgresChatHistoryRepository: ChatHistoryRepository = {
  async append(conversation) {
    const rows = await query<DocumentRow<ChatConversation>>(`
      INSERT INTO trovio.app_documents(collection,id,owner_id,payload)
      VALUES ('chat-history',$1,$2,$3::jsonb)
      ON CONFLICT(collection,id) DO UPDATE SET
        payload=jsonb_set(jsonb_set(trovio.app_documents.payload, '{messages}',
          coalesce(trovio.app_documents.payload->'messages','[]'::jsonb) || (EXCLUDED.payload->'messages')),
          '{updatedAt}',to_jsonb(GREATEST(trovio.app_documents.payload->>'updatedAt',EXCLUDED.payload->>'updatedAt'))),
        updated_at=now()
      WHERE trovio.app_documents.owner_id=EXCLUDED.owner_id
      RETURNING payload`, [conversation.id, conversation.userId, JSON.stringify(conversation)]);
    if (!rows[0]) throw new Error("Conversation owner mismatch.");
    return rows[0].payload;
  },
  async summarizeUser(userId) {
    const rows = await query<{
      conversations: number; questions: number; answered: number; refused: number; unknown: number;
      lastActiveAt: string | null; byIntent: [string, number][];
    }>(`
      WITH conversations AS (
        SELECT payload, updated_at FROM trovio.app_documents
        WHERE collection = 'chat-history' AND owner_id = $1
      ), messages AS (
        SELECT m FROM conversations,
        LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(payload->'messages') = 'array'
          THEN payload->'messages' ELSE '[]'::jsonb END) m
      ), topics AS (
        SELECT coalesce(nullif(m->'answer'->>'intent', ''), 'unknown') AS intent, count(*)::int AS n
        FROM messages WHERE m->>'role' = 'assistant' GROUP BY 1
      )
      SELECT (SELECT count(*)::int FROM conversations) AS conversations,
        (SELECT max(updated_at) FROM conversations) AS "lastActiveAt",
        count(*) FILTER (WHERE m->>'role' = 'user')::int AS questions,
        count(*) FILTER (WHERE m->>'role' = 'assistant' AND m->'answer'->>'kind' = 'answer')::int AS answered,
        count(*) FILTER (WHERE m->>'role' = 'assistant' AND m->'answer'->>'kind' = 'refusal')::int AS refused,
        count(*) FILTER (WHERE m->>'role' = 'assistant' AND m->'answer'->>'kind' IN ('unknown', 'clarify'))::int AS unknown,
        coalesce((SELECT jsonb_agg(jsonb_build_array(intent, n) ORDER BY n DESC, intent) FROM topics), '[]'::jsonb) AS "byIntent"
      FROM messages`, [userId]);
    const row = rows[0];
    return {
      conversationCount: row.conversations, questionCount: row.questions,
      answered: row.answered, refused: row.refused, unknown: row.unknown,
      lastActiveAt: row.lastActiveAt ? new Date(row.lastActiveAt).toISOString() : null,
      byIntent: row.byIntent,
    };
  },
  async findById(id, userId) {
    const conversation = await getDocument<ChatConversation>("chat-history", id);
    return conversation?.userId === userId ? conversation : null;
  },
  async listByUser(userId, limit = 20, offset = 0) {
    const rows = await query<DocumentRow<ChatConversation>>(
      `SELECT payload FROM trovio.app_documents
       WHERE collection = 'chat-history' AND owner_id = $1
       ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [userId, Math.max(1, Math.min(100, Math.trunc(limit))), Math.max(0, Math.trunc(offset))],
    );
    return rows.map((row) => row.payload);
  },
  async listUsers(search = "", limit = 30, offset = 0) {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    const safeOffset = Math.max(0, Math.trunc(offset));
    const filter = search.trim().slice(0, 100);
    const rows = await query<ChatHistoryUserRow & { total: string; conversationCount: string; questionCount: string; lastActiveAt: Date }>(`
      WITH activity AS (
        SELECT owner_id AS "userId", count(*) AS "conversationCount",
               sum(CASE WHEN jsonb_typeof(payload->'messages') = 'array'
                   THEN (SELECT count(*) FROM jsonb_array_elements(payload->'messages') m WHERE m->>'role'='user') ELSE 0 END) AS "questionCount",
               max(updated_at) AS "lastActiveAt"
        FROM trovio.app_documents
        WHERE collection = 'chat-history' AND owner_id IS NOT NULL
        GROUP BY owner_id
      )
      SELECT a.*, u.name, u.email, count(*) OVER () AS total
      FROM activity a JOIN trovio.users u ON u.id = a."userId"
      WHERE $1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
      ORDER BY a."lastActiveAt" DESC
      LIMIT $2 OFFSET $3`, [filter, safeLimit, safeOffset]);
    return {
      rows: rows.map((row) => ({
        userId: row.userId, name: row.name, email: row.email,
        conversationCount: Number(row.conversationCount), questionCount: Number(row.questionCount),
        lastActiveAt: new Date(row.lastActiveAt).toISOString(),
      })),
      total: rows.length ? Number(rows[0].total) : Number((await query<{ total: string }>(`
        SELECT count(DISTINCT u.id)::text AS total FROM trovio.users u
        JOIN trovio.app_documents d ON d.owner_id=u.id AND d.collection='chat-history'
        WHERE $1='' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'`, [filter]))[0].total),
    };
  },
  put: (conversation) => putDocument("chat-history", conversation.id, conversation, { ownerId: conversation.userId }),
  async delete(id, userId) {
    const conversation = await getDocument<ChatConversation>("chat-history", id);
    return conversation?.userId === userId ? deleteDocument("chat-history", id) : false;
  },
};

export const postgresNotificationRepository: NotificationRepository = {
  add: (notification) => putDocument("notification", notification.id, notification, { ownerId: notification.userId, status: notification.read ? "read" : "unread" }).then(() => undefined),
  listByUser: (userId, limit = 20) => listDocuments<AppNotification>("notification", { ownerId: userId }, limit),
  async markRead(userId, ids) {
    let changed = 0;
    for (const item of await listDocuments<AppNotification>("notification", { ownerId: userId }, 50)) {
      if (!item.read && (!ids || ids.includes(item.id))) {
        await putDocument("notification", item.id, { ...item, read: true }, { ownerId: userId, status: "read" });
        changed++;
      }
    }
    return changed;
  },
};

export const postgresSupplementaryRepository: SupplementaryRepository = {
  list: () => listDocuments<SupplementaryRound>("supplementary-round"),
};

export const postgresChatAliasRepository: ChatAliasRepository = {
  list: () => listDocuments<ChatAlias>("chat-alias"),
  add: (alias) => putDocument("chat-alias", alias.id, alias, { ownerId: alias.createdBy, parentId: alias.targetId, status: alias.kind }).then(() => undefined),
  delete: (id) => deleteDocument("chat-alias", id),
};

const emptyFunnel = (): Record<FunnelEvent, number> =>
  Object.fromEntries(FUNNEL_EVENTS.map((event) => [event, 0])) as Record<FunnelEvent, number>;

export const postgresAnalyticsRepository: AnalyticsRepository = {
  async record(day, event, anonId) {
    await query(
      `INSERT INTO trovio.analytics_events (day, event, anon_id)
       VALUES ($1::date, $2, $3) ON CONFLICT DO NOTHING`,
      [day, event, anonId],
    );
    if (Math.random() < 0.01) await query("DELETE FROM trovio.analytics_events WHERE day < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 364");
  },
  async summary(from, to) {
    const result = emptyFunnel();
    const rows = await query<{ event: FunnelEvent; count: string }>(
      `SELECT event, count(DISTINCT anon_id)::text AS count
       FROM trovio.analytics_events WHERE day BETWEEN $1::date AND $2::date GROUP BY event`,
      [from, to],
    );
    for (const row of rows) result[row.event] = Number(row.count);
    return result;
  },
  async daily(from, to) {
    const rows = await query<{ day: string; event: FunnelEvent; count: string }>(
      `SELECT day::text, event, count(*)::text AS count
       FROM trovio.analytics_events WHERE day BETWEEN $1::date AND $2::date
       GROUP BY day, event ORDER BY day`,
      [from, to],
    );
    const days = new Map<string, Record<FunnelEvent, number>>();
    for (const row of rows) {
      const counts = days.get(row.day) ?? emptyFunnel();
      counts[row.event] = Number(row.count);
      days.set(row.day, counts);
    }
    return [...days].map(([day, counts]) => ({ day, counts }));
  },
};

export const postgresSurveyRepository: SurveyRepository = {
  add: (response) => putDocument("sus-response", response.id, response, { status: response.role }).then(() => undefined),
  list: () => listDocuments<SusResponse>("sus-response"),
};

export const postgresQaRepository: QaRepository = {
  create: (question) => putDocument("qa-question", question.id, question, { ownerId: question.userId, parentId: question.programId, status: question.status }),
  update: (id, transform) => updateDocument<QaQuestion>("qa-question", id, transform, (value) => ({ ownerId: value.userId, parentId: value.programId, status: value.status })),
  findById: (id) => getDocument<QaQuestion>("qa-question", id),
  listByProgram: (programId) => listDocuments<QaQuestion>("qa-question", { parentId: programId }),
  list: () => listDocuments<QaQuestion>("qa-question"),
};

export const postgresImportBatchRepository: ImportBatchRepository = {
  add: (item) => putDocument("import-batch", item.id, item, { ownerId: item.byId }).then(() => undefined),
  list: (limit = 20) => listDocuments<ImportBatch>("import-batch", undefined, limit),
};

export function newDocumentId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
