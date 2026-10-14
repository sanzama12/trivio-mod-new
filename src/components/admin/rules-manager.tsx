"use client";

/**
 * A09 — trọng số 4 tiêu chí (tổng 100%), danh sách quy tắc (cấu hình / sao chép / bật-tắt / xoá),
 * bộ chạy thử (Simulator) dùng trọng số đang chỉnh — chưa lưu vẫn xem được tác động.
 */
import { useMemo, useState } from "react";
import { LuPlay, LuPlus, LuSearch } from "react-icons/lu";
import type { RecRule, RecRuleKind, RecommendConfig } from "@/domain/types";
import { RIASEC_INFO } from "@/domain/riasec";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeVi } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Dialog } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { fmtDate, inputCls, Panel, selectCls } from "./ui";

type Weights = RecommendConfig["weights"];
type ParamRule = { min: number; max: number } | { options: string[] };
type SimItem = { id: string; slug: string; name: string; school: string; major: string; cutoff: number | null; tuitionMin: number; match: number; reasons: string[] };

const STATUS: Record<RecRule["status"], { label: string; tone: BadgeTone }> = {
  active: { label: "Đang áp dụng", tone: "success" },
  draft: { label: "Bản nháp", tone: "accent" },
  disabled: { label: "Vô hiệu", tone: "slate" },
};
const KIND_TONE: Partial<Record<RecRuleKind, BadgeTone>> = { "riasec-match": "primary", budget: "danger", diversity: "teal", "goal-priority": "violet", "min-years": "slate", "boost-cutoff": "primary", "boost-school-type": "primary" };
const CODES = ["RIA", "RIC", "IRC", "IAS", "ISE", "ASE", "AES", "SEC", "SEA", "ESC", "ECS", "CEI"];

export function RulesManager({
  weights,
  rules,
  labels,
  paramRules,
  creatable,
}: {
  weights: Weights;
  rules: RecRule[];
  labels: { weights: Record<keyof Weights, string>; kinds: Record<RecRuleKind, string>; params: Record<string, string>; schoolTypes: Record<string, string> };
  paramRules: Record<RecRuleKind, Record<string, ParamRule>>;
  creatable: RecRuleKind[];
}) {
  const { post, busy } = useAdminPost();
  const [w, setW] = useState<Weights>(weights);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [cfgRule, setCfgRule] = useState<{ rule?: RecRule; kind: RecRuleKind; name: string; description: string; params: Record<string, string> } | null>(null);
  const [err, setErr] = useState<{ field?: string; message?: string } | null>(null);
  const [del, setDel] = useState<RecRule | null>(null);
  const [sim, setSim] = useState({ score: "27.5", code: "RIA", budget: "30", region: "bac", combo: "A00", includeDrafts: false });
  const [simRes, setSimRes] = useState<SimItem[] | null>(null);
  const total = w.interest + w.fit + w.place + w.group;
  const changed = (Object.keys(w) as (keyof Weights)[]).some((k) => w[k] !== weights[k]);

  const list = useMemo(() => {
    const nq = normalizeVi(q.trim());
    return rules.filter((r) => (!status || r.status === status) && (!nq || normalizeVi(`${r.name} ${r.description}`).includes(nq)));
  }, [rules, q, status]);

  const openCfg = (rule?: RecRule) => {
    setErr(null);
    const kind = rule?.kind ?? creatable[0];
    setCfgRule({ rule, kind, name: rule?.name ?? "", description: rule?.description ?? "", params: Object.fromEntries(Object.entries(rule?.params ?? {}).map(([k, v]) => [k, String(v)])) });
  };
  const saveCfg = async () => {
    if (!cfgRule) return;
    const body = cfgRule.rule
      ? { kind: "rule", action: "configure", id: cfgRule.rule.id, params: cfgRule.params }
      : { kind: "rule", action: "create", ruleKind: cfgRule.kind, name: cfgRule.name, description: cfgRule.description, params: cfgRule.params };
    // API dùng trường `kind` cho loại thao tác → loại quy tắc gửi qua `ruleKind`.
    const res = await post("/api/admin/rules", body, { success: cfgRule.rule ? "Đã cập nhật cấu hình (tăng phiên bản)." : "Đã thêm quy tắc ở trạng thái Bản nháp." });
    if (res.ok) setCfgRule(null);
    else setErr({ field: res.field, message: res.message });
  };
  const runSim = async () => {
    const res = await post("/api/admin/rules", { kind: "simulate", weights: w, ...sim }, { refresh: false });
    if (res.ok) setSimRes(res.items as SimItem[]);
  };
  const paramText = (r: RecRule) =>
    Object.entries(r.params)
      .map(([k, v]) => `${labels.params[k] ?? k}: ${k === "schoolType" ? (labels.schoolTypes[String(v)] ?? v) : v}`)
      .join(" · ");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Panel className="p-5 sm:p-6" aria-labelledby="w-h">
          <div className="flex items-center justify-between gap-3">
            <h2 id="w-h" className="text-lg font-bold text-slate-900">
              Trọng số tiêu chí gợi ý
            </h2>
            <Badge tone={total === 100 ? "success" : "danger"}>Tổng: {total}%</Badge>
          </div>
          <div className="mt-5 space-y-5">
            {(Object.keys(w) as (keyof Weights)[]).map((k) => (
              <div key={k} className="grid grid-cols-[minmax(0,150px)_1fr_48px] items-center gap-4">
                <label htmlFor={`w-${k}`} className="text-sm font-semibold text-slate-800">
                  {labels.weights[k]}
                </label>
                <input id={`w-${k}`} type="range" min={0} max={100} step={5} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} className="w-full accent-primary-600" aria-valuetext={`${w[k]}%`} />
                <span className="text-right text-sm font-bold text-primary-600 tabular-nums">{w[k]}%</span>
              </div>
            ))}
          </div>
          {total !== 100 && <p className="mt-3 text-xs text-danger-700">Tổng trọng số phải bằng 100% (hiện {total}%).</p>}
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-5">
            {changed && (
              <Button variant="outline" onClick={() => setW(weights)}>
                Hoàn tác
              </Button>
            )}
            <Button disabled={busy || total !== 100 || !changed} onClick={() => post("/api/admin/rules", { kind: "weights", weights: w }, { success: "Đã lưu trọng số — trang Gợi ý dùng ngay." })}>
              Lưu trọng số
            </Button>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6" aria-labelledby="sim-h">
          <h2 id="sim-h" className="text-lg font-bold text-slate-900">
            Kiểm thử Quy tắc (Simulator)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-800">
              Nhập điểm thi THPT
              <input inputMode="decimal" className={cn(inputCls, "mt-1.5 bg-slate-50")} value={sim.score} onChange={(e) => setSim({ ...sim, score: e.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Mã RIASEC
              <select className={cn(selectCls, "mt-1.5 w-full bg-slate-50")} value={sim.code} onChange={(e) => setSim({ ...sim, code: e.target.value })}>
                {CODES.map((c) => (
                  <option key={c} value={c}>
                    {c} - {RIASEC_INFO[c[0] as keyof typeof RIASEC_INFO].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Ngân sách tối đa (triệu/năm)
              <input inputMode="numeric" className={cn(inputCls, "mt-1.5 bg-slate-50")} value={sim.budget} onChange={(e) => setSim({ ...sim, budget: e.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Khu vực mong muốn
              <select className={cn(selectCls, "mt-1.5 w-full bg-slate-50")} value={sim.region} onChange={(e) => setSim({ ...sim, region: e.target.value })}>
                <option value="bac">Miền Bắc (Hà Nội…)</option>
                <option value="trung">Miền Trung</option>
                <option value="nam">Miền Nam (TP.HCM…)</option>
                <option value="">Không giới hạn</option>
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="size-4 accent-primary-600" checked={sim.includeDrafts} onChange={(e) => setSim({ ...sim, includeDrafts: e.target.checked })} /> Tính cả quy tắc Bản nháp
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate-500">{simRes ? `Đã tải ${simRes.length} kết quả phù hợp nhất` : "Dùng trọng số đang chỉnh (kể cả chưa lưu)"}</p>
            <Button disabled={busy || total !== 100} onClick={runSim}>
              <LuPlay className="size-4" aria-hidden /> Chạy thử quy tắc
            </Button>
          </div>
          {simRes && (
            <ol className="mt-4 divide-y divide-slate-200 rounded-xl bg-slate-50 px-4">
              {simRes.length === 0 && <li className="py-4 text-sm text-slate-500">Không có chương trình nào thoả các quy tắc với hồ sơ này.</li>}
              {simRes.map((r, i) => (
                <li key={r.id} className="py-3">
                  <p className="flex items-start justify-between gap-3 text-sm font-bold text-slate-900">
                    <span>
                      {i + 1}. {r.school} — {r.name}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-success-700">{r.match}% Match</span>
                  </p>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    Ngành: {r.major} • Điểm chuẩn: {r.cutoff ?? "—"} • Học phí: {r.tuitionMin}tr/năm
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel className="flex flex-wrap items-center gap-3 p-4">
          <label className="relative min-w-[160px] flex-1">
            <span className="sr-only">Tìm quy tắc</span>
            <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input type="search" className={`${inputCls} pl-9`} placeholder="Tìm quy tắc gợi ý…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select aria-label="Trạng thái" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Trạng thái: Tất cả</option>
            <option value="active">Đang áp dụng</option>
            <option value="draft">Bản nháp</option>
            <option value="disabled">Vô hiệu</option>
          </select>
          <Button onClick={() => openCfg()}>
            <LuPlus className="size-4" aria-hidden /> Thêm quy tắc mới
          </Button>
        </Panel>
        {list.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Không có quy tắc nào khớp bộ lọc.</p>}
        {list.map((r) => (
          <Panel key={r.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{r.name}</h3>
              <Badge tone={KIND_TONE[r.kind] ?? "primary"}>{labels.kinds[r.kind]}</Badge>
              <span className="text-xs text-slate-500">{r.version}</span>
              <Badge tone={STATUS[r.status].tone} className="ml-auto">
                {STATUS[r.status].label}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{r.description}</p>
            {Object.keys(r.params).length > 0 && <p className="mt-1.5 text-[13px] font-medium text-slate-700">{paramText(r)}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-sm">
              <span className="mr-auto text-[13px] text-slate-500">Cập nhật: {fmtDate(r.updatedAt)}</span>
              {Object.keys(paramRules[r.kind] ?? {}).length > 0 && (
                <button type="button" className="font-semibold text-primary-600 hover:underline" onClick={() => openCfg(r)}>
                  Cấu hình
                </button>
              )}
              <button type="button" disabled={busy} className="font-semibold text-slate-600 hover:underline" onClick={() => post("/api/admin/rules", { kind: "rule", action: "duplicate", id: r.id }, { success: "Đã sao chép thành bản nháp." })}>
                Sao chép
              </button>
              {r.status === "active" ? (
                <button type="button" disabled={busy} className="font-semibold text-danger-700 hover:underline" onClick={() => post("/api/admin/rules", { kind: "rule", action: "status", id: r.id, status: "disabled" }, { success: "Đã vô hiệu hoá quy tắc." })}>
                  Vô hiệu hóa
                </button>
              ) : (
                <button type="button" disabled={busy} className="font-semibold text-success-700 hover:underline" onClick={() => post("/api/admin/rules", { kind: "rule", action: "status", id: r.id, status: "active" }, { success: "Đã kích hoạt quy tắc." })}>
                  Kích hoạt
                </button>
              )}
              {!r.builtin && (
                <button type="button" className="font-semibold text-danger-700 hover:underline" onClick={() => setDel(r)}>
                  Xoá
                </button>
              )}
            </div>
          </Panel>
        ))}
      </div>

      <Dialog
        open={!!cfgRule}
        onClose={() => setCfgRule(null)}
        title={cfgRule?.rule ? `Cấu hình: ${cfgRule.rule.name}` : "Thêm quy tắc mới"}
        subtitle={cfgRule?.rule ? "Lưu sẽ tăng số phiên bản và ghi nhật ký" : "Quy tắc mới ở trạng thái Bản nháp — chạy thử rồi mới kích hoạt"}
        footer={
          <>
            <Button variant="outline" onClick={() => setCfgRule(null)}>
              Hủy
            </Button>
            <Button disabled={busy} onClick={saveCfg}>
              Lưu
            </Button>
          </>
        }
      >
        {cfgRule && (
          <div className="space-y-4">
            {err && !err.field && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{err.message}</p>}
            {!cfgRule.rule && (
              <>
                <label className="block text-sm font-semibold text-slate-800">
                  Loại quy tắc
                  <select data-autofocus className={cn(selectCls, "mt-1.5 w-full")} value={cfgRule.kind} onChange={(e) => setCfgRule({ ...cfgRule, kind: e.target.value as RecRuleKind, params: {} })}>
                    {creatable.map((k) => (
                      <option key={k} value={k}>
                        {labels.kinds[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  Tên quy tắc
                  <input className={cn(inputCls, "mt-1.5", err?.field === "name" && "!border-danger-500")} maxLength={80} value={cfgRule.name} onChange={(e) => setCfgRule({ ...cfgRule, name: e.target.value })} />
                  {err?.field === "name" && <span className="mt-1 block text-xs font-normal text-danger-700">{err.message}</span>}
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  Mô tả
                  <textarea rows={2} className={cn(inputCls, "mt-1.5 h-auto py-2")} maxLength={240} value={cfgRule.description} onChange={(e) => setCfgRule({ ...cfgRule, description: e.target.value })} />
                </label>
              </>
            )}
            {Object.entries(paramRules[cfgRule.kind] ?? {}).map(([k, rule]) => (
              <label key={k} className="block text-sm font-semibold text-slate-800">
                {labels.params[k] ?? k}
                {"options" in rule ? (
                  <select className={cn(selectCls, "mt-1.5 w-full", err?.field === k && "!border-danger-500")} value={cfgRule.params[k] ?? ""} onChange={(e) => setCfgRule({ ...cfgRule, params: { ...cfgRule.params, [k]: e.target.value } })}>
                    <option value="">Chọn…</option>
                    {rule.options.map((o) => (
                      <option key={o} value={o}>
                        {labels.schoolTypes[o] ?? o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input inputMode="decimal" className={cn(inputCls, "mt-1.5", err?.field === k && "!border-danger-500")} value={cfgRule.params[k] ?? ""} onChange={(e) => setCfgRule({ ...cfgRule, params: { ...cfgRule.params, [k]: e.target.value } })} placeholder={`${rule.min}–${rule.max}`} />
                )}
                {err?.field === k && <span className="mt-1 block text-xs font-normal text-danger-700">{err.message}</span>}
              </label>
            ))}
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Xoá quy tắc?"
        subtitle={del?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setDel(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                const r = del;
                setDel(null);
                if (r) await post("/api/admin/rules", { kind: "rule", action: "delete", id: r.id }, { success: "Đã xoá quy tắc." });
              }}
            >
              Xoá
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Quy tắc bị xoá khỏi danh sách (nhật ký vẫn giữ lịch sử). Nếu chỉ muốn tạm dừng, hãy dùng “Vô hiệu hóa”.</p>
      </Dialog>
    </div>
  );
}
