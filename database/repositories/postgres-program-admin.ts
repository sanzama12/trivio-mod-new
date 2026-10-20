import { afterCommit, query, withTransaction } from "@database/client";
import { invalidatePostgresCache } from "./postgres";
import { invalidateDiscoveryStats } from "./postgres-catalog";
import type { ProgramAdminRepository } from "./types";

export const postgresProgramAdminRepository: ProgramAdminRepository = {
  // Changes are persisted in programs and child tables; no JSON overlay remains.
  hasEdits: async (programId) => (await query("SELECT 1 FROM trovio.program_baselines WHERE program_id=$1", [programId])).length > 0,
  async listEditedIds() {
    return (await query<{ program_id: string }>("SELECT program_id FROM trovio.program_baselines ORDER BY program_id"))
      .map((row) => row.program_id);
  },
  async patchProgram(programId, patch, audit) {
    await withTransaction(async () => {
      await query("SELECT trovio.save_program_patch($1, $2::jsonb)", [programId, patch == null ? null : JSON.stringify(patch)]);
      await query(`INSERT INTO trovio.app_documents(collection,id,owner_id,parent_id,status,payload)
        VALUES ('audit',$1,$2,$3,$4,$5::jsonb)`,
        [audit.id, audit.actorId, audit.programId, audit.targetType ?? "program", JSON.stringify(audit)]);
      afterCommit(invalidatePostgresCache);
      afterCommit(invalidateDiscoveryStats);
    });
  },
  async patchProgramsBatch(entries) {
    if (!entries.length) return;
    await withTransaction(async () => {
      const payload = JSON.stringify([...entries].sort((a,b) => a.programId.localeCompare(b.programId)));
      await query(`SELECT trovio.save_program_patch(item->>'programId', item->'patch')
        FROM jsonb_array_elements($1::jsonb) items(item) ORDER BY item->>'programId'`, [payload]);
      await query(`INSERT INTO trovio.app_documents(collection,id,owner_id,parent_id,status,payload)
        SELECT 'audit', item->'audit'->>'id', item->'audit'->>'actorId', item->>'programId',
          COALESCE(item->'audit'->>'targetType','program'), item->'audit'
        FROM jsonb_array_elements($1::jsonb) items(item)`, [payload]);
      afterCommit(invalidatePostgresCache);
      afterCommit(invalidateDiscoveryStats);
    });
  },
  async listAudit(limit = 50) {
    return (await query<{ payload: Awaited<ReturnType<ProgramAdminRepository["listAudit"]>>[number] }>(
      `SELECT payload FROM trovio.app_documents WHERE collection='audit' AND status='program'
       ORDER BY updated_at DESC LIMIT $1`, [Math.max(1, Math.min(10000, limit))])).map((row) => row.payload);
  },
};
