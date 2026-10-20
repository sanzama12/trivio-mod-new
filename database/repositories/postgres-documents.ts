/**
 * PostgreSQL repositories cho các aggregate có cấu trúc thay đổi theo workflow.
 * Dữ liệu được lưu trong `trovio.app_documents`; không đọc/ghi filesystem và
 * không tự sinh dữ liệu mẫu. Các danh mục tuyển sinh lõi vẫn dùng bảng quan hệ.
 */
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "@database/client";
import { FUNNEL_EVENTS } from "@/domain/types";
import type {
  AnalyticsRepository,
  AuditRepository,
  ChatAliasRepository,
  ChatLogRepository,
  ClassRepository,
  CommentRepository,
  ImportBatchRepository,
  NotificationRepository,
  QaRepository,
  RecommendConfigRepository,
  ReminderLogRepository,
  SchoolSubmissionRepository,
  ShareRepository,
  SurveyRepository,
  SupplementaryRepository,
  TeacherVerificationRepository,
  TimelineConfigRepository,
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
  RecommendConfig,
  SchoolSubmission,
  Share,
  ShareComment,
  SusResponse,
  SupplementaryRound,
  TeacherClass,
  TeacherVerification,
  TimelineConfig,
  UserData,
} from "@/domain/types";

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
  get: (userId) => getDocument<UserData>("user-data", userId),
  put: (userId, data) => putDocument("user-data", userId, data, { ownerId: userId }),
  async delete(userId) {
    await deleteDocument("user-data", userId);
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

export const postgresTimelineConfigRepository: TimelineConfigRepository = {
  get: () => getDocument<TimelineConfig>("timeline-config", "active"),
  async set(config) {
    if (config) await putDocument("timeline-config", "active", config, { ownerId: config.updatedBy, status: config.official ? "official" : "draft" });
    else await deleteDocument("timeline-config", "active");
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

export const postgresReminderLogRepository: ReminderLogRepository = {
  async sent(keys) {
    if (!keys.length) return new Set<string>();
    const rows = await query<{ key: string }>(`SELECT key FROM trovio.reminder_log WHERE key = ANY($1::text[])`, [keys]);
    return new Set(rows.map((row) => row.key));
  },
  async add(keys) {
    if (!keys.length) return;
    await query(
      `INSERT INTO trovio.reminder_log (key)
       SELECT unnest($1::text[]) ON CONFLICT (key) DO NOTHING`,
      [keys],
    );
  },
};

export const postgresQaRepository: QaRepository = {
  create: (question) => putDocument("qa-question", question.id, question, { ownerId: question.userId, parentId: question.programId, status: question.status }),
  update: (id, transform) => updateDocument<QaQuestion>("qa-question", id, transform, (value) => ({ ownerId: value.userId, parentId: value.programId, status: value.status })),
  findById: (id) => getDocument<QaQuestion>("qa-question", id),
  listByProgram: (programId) => listDocuments<QaQuestion>("qa-question", { parentId: programId }),
  list: () => listDocuments<QaQuestion>("qa-question"),
};

export const postgresClassRepository: ClassRepository = {
  create: (item) => putDocument("teacher-class", item.id, item, { ownerId: item.teacherId, status: item.code }),
  update: (id, patch) => updateDocument<TeacherClass>("teacher-class", id, patch, (value) => ({ ownerId: value.teacherId, status: value.code })),
  findById: (id) => getDocument<TeacherClass>("teacher-class", id),
  async findByCode(code) {
    return (await listDocuments<TeacherClass>("teacher-class", { status: code }, 1))[0] ?? null;
  },
  listByTeacher: (teacherId) => listDocuments<TeacherClass>("teacher-class", { ownerId: teacherId }),
  async listByMember(userId) {
    return (await listDocuments<TeacherClass>("teacher-class")).filter((item) => item.memberIds.includes(userId));
  },
  async delete(id, teacherId) {
    const current = await getDocument<TeacherClass>("teacher-class", id);
    return current?.teacherId === teacherId ? deleteDocument("teacher-class", id) : false;
  },
};

export const postgresTeacherVerificationRepository: TeacherVerificationRepository = {
  create: (item) => putDocument("teacher-verification", item.id, item, { ownerId: item.userId, status: item.status }),
  findById: (id) => getDocument<TeacherVerification>("teacher-verification", id),
  async findByUserId(userId) {
    return (await listDocuments<TeacherVerification>("teacher-verification", { ownerId: userId }, 1))[0] ?? null;
  },
  list: (filter) => listDocuments<TeacherVerification>("teacher-verification", { status: filter?.status }),
  update: (id, patch) => updateDocument<TeacherVerification>("teacher-verification", id, patch, (value) => ({ ownerId: value.userId, status: value.status })),
};

export const postgresRecommendConfigRepository: RecommendConfigRepository = {
  get: () => getDocument<RecommendConfig>("recommend-config", "active"),
  save: (config) => putDocument("recommend-config", "active", config).then(() => undefined),
};

export const postgresImportBatchRepository: ImportBatchRepository = {
  add: (item) => putDocument("import-batch", item.id, item, { ownerId: item.byId }).then(() => undefined),
  list: (limit = 20) => listDocuments<ImportBatch>("import-batch", undefined, limit),
};

export const postgresSchoolSubmissionRepository: SchoolSubmissionRepository = {
  add: (item) => putDocument("school-submission", item.id, item, { ownerId: item.userId, parentId: item.schoolId, status: item.status }).then(() => undefined),
  async list(filter) {
    const rows = await listDocuments<SchoolSubmission>("school-submission", { parentId: filter?.schoolId, status: filter?.status });
    return rows;
  },
  findById: (id) => getDocument<SchoolSubmission>("school-submission", id),
  update: (id, patch) => updateDocument<SchoolSubmission>("school-submission", id, patch, (value) => ({ ownerId: value.userId, parentId: value.schoolId, status: value.status })),
};

export function newDocumentId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
