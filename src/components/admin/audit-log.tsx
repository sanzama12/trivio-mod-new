import type { AuditEntry } from "@/domain/types";
import { Card } from "@/components/ui/card";
import { ACTION_LABEL as ACTION, FIELD_LABEL as FIELD, TARGET_LABEL as TARGET } from "@/domain/audit-labels";

const when = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

/** Nhật ký thay đổi dữ liệu (ai, lúc nào, trường nào, trước → sau). */
export function AuditLog({ entries, names, title = "Nhật ký thay đổi gần đây" }: { entries: AuditEntry[]; names?: Record<string, string>; title?: string }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Chưa có thay đổi nào.</p>
      ) : (
        <Card className="mt-3 divide-y divide-slate-100">
          {entries.map((e) => (
            <div key={e.id} className="min-w-0 p-4 text-sm [overflow-wrap:anywhere]">
              <p className="text-slate-900">
                <strong>{ACTION[e.action] ?? e.action}</strong>
                <span className="text-slate-500"> · {TARGET[e.targetType ?? "program"]}</span>
                {names?.[e.programId] && <> · {names[e.programId]}</>}
              </p>
              <p className="text-xs text-slate-500">
                {when(e.at)} · {e.actorEmail}
              </p>
              <ul className="mt-2 space-y-1">
                {e.changes.map((c, i) => (
                  <li key={i} className="text-[13px] text-slate-600">
                    <span className="font-semibold text-slate-700">{FIELD[c.field] ?? c.field}:</span> <span className="line-through decoration-slate-400">{c.before}</span> →{" "}
                    <span className="font-semibold text-success-700">{c.after}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
