/**
 * SERVICE LAYER — Ghi vết kiểm toán (Audit Logging) cho các thao tác quản trị, bảo mật và quyền riêng tư.
 */
import { randomUUID } from "node:crypto";
import { repositories } from "@database/repositories";

export interface AuditLogParams {
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
  details?: Record<string, unknown>;
}

export const auditService = {
  async log(params: AuditLogParams): Promise<void> {
    const detailText = params.detail || (params.details ? JSON.stringify(params.details) : "");
    try {
      await repositories.audit.append({
        id: randomUUID(),
        at: new Date().toISOString(),
        actorId: params.actorId,
        actorEmail: params.actorEmail || "unknown",
        programId: params.targetId || "system",
        targetType: (params.targetType as "user" | "program" | "school" | "rules") || "user",
        action: "update",
        changes: [
          {
            field: params.action,
            before: "—",
            after: detailText,
          },
        ],
      });
    } catch (err) {
      // Ghi lỗi audit an toàn mà không làm gián đoạn luồng chính nếu đang ở chế độ kiểm thử
      console.error("[auditService] Failed to append audit entry:", err);
    }
  },
};
