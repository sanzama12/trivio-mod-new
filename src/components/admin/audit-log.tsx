import type { AuditEntry } from "@/domain/types";
import { Card } from "@/components/ui/card";
import { ACTION_LABEL as ACTION, FIELD_LABEL as FIELD, TARGET_LABEL as TARGET } from "@/domain/audit-labels";

const when = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

/** Nhật ký thay đổi dữ liệu (ai, lúc nào, trường nào, trước → sau). */
export function AuditLog({
  entries,
  names,
  title = "Nhật ký thay đổi gần đây",
  compact = false,
  limit,
}: {
  entries: AuditEntry[];
  names?: Record<string, string>;
  title?: string;
  compact?: boolean;
  limit?: number;
}) {
  const visible = limit ? entries.slice(0, limit) : entries;
  return (
    <section className={compact ? "mt-6" : "mt-10"}>
      <h2 className="text-lg font-bold">{title}</h2>
      {visible.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Chưa có thay đổi nào.</p>
      ) : (
        <Card className="mt-3 divide-y divide-slate-100">
          {visible.map((e) => {
            const first = e.changes[0];
            const rest = e.changes.slice(1);
            return (
              <div key={e.id} className={compact ? "min-w-0 px-3 py-2.5 text-sm" : "min-w-0 p-4 text-sm"}>
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <strong className="text-slate-900">{ACTION[e.action] ?? e.action}</strong>
                  <span className="truncate text-slate-500">{TARGET[e.targetType ?? "program"]}{names?.[e.programId] ? ` · ${names[e.programId]}` : ""}</span>
                  <time className="ml-auto shrink-0 text-xs text-slate-500" dateTime={e.at} title={when(e.at)}>{when(e.at)}</time>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500" title={e.actorEmail}>{e.actorEmail}</p>
                {first ? (
                  <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">
                    <span className="font-semibold text-slate-700">{FIELD[first.field] ?? first.field}:</span> {first.before} → <span className="font-semibold text-success-700">{first.after}</span>
                  </p>
                ) : null}
                {rest.length > 0 ? (
                  <details className="mt-1 text-[13px] text-slate-600">
                    <summary className="cursor-pointer font-semibold text-primary-700">+{rest.length} thay đổi khác</summary>
                    <ul className="mt-1 space-y-1 pl-4">
                      {rest.map((c, i) => <li key={i}><span className="font-semibold text-slate-700">{FIELD[c.field] ?? c.field}:</span> {c.before} → <span className="font-semibold text-success-700">{c.after}</span></li>)}
                    </ul>
                  </details>
                ) : null}
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}
