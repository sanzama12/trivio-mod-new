/**
 * SERVICE LAYER — cấu hình quy tắc gợi ý (A09): trọng số 4 tiêu chí + danh sách quy tắc bật/tắt/bản nháp.
 * Thuật toán gợi ý (recommendation.service) đọc cấu hình hiệu lực qua `effectiveRecommendConfig()`.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, RecommendConfig, RecRule, RecRuleKind, RecRuleStatus, RiasecType, SchoolType } from "../domain/types";
import { repositories } from "../repositories";

export const DEFAULT_REC_WEIGHTS = { interest: 45, fit: 35, place: 10, group: 10 } as const;
export const WEIGHT_LABELS: Record<keyof RecommendConfig["weights"], string> = {
  interest: "Kết quả RIASEC (hợp sở thích)",
  fit: "Điểm thi THPT (khả năng trúng tuyển)",
  place: "Khu vực ưu tiên",
  group: "Nhóm ngành quan tâm",
};

const now = () => new Date().toISOString();
const BASE_TIME = "2026-09-15T00:00:00.000Z";

export const RULE_KIND_LABELS: Record<RecRuleKind, string> = {
  "riasec-match": "Khớp ngành",
  budget: "Bộ lọc",
  diversity: "Đa dạng",
  "goal-priority": "Mục tiêu",
  "min-years": "Dữ liệu",
  "boost-cutoff": "Xếp hạng",
  "boost-school-type": "Xếp hạng",
};

/** Các loại quy tắc chỉ có MỘT bản đang áp dụng. */
const SINGLETON: RecRuleKind[] = ["riasec-match", "budget", "diversity", "goal-priority", "min-years", "boost-cutoff"];
/** Loại quy tắc quản trị viên được tạo mới. */
export const CREATABLE_KINDS: RecRuleKind[] = ["boost-cutoff", "boost-school-type"];

export const DEFAULT_RULES: RecRule[] = [
  { id: "r-riasec", kind: "riasec-match", name: "Ưu tiên ngành phù hợp RIASEC", description: "Điểm sở thích = mức khớp mã Holland của học sinh với ngành, nhân trọng số nhóm cấu hình ở mục Bài test RIASEC.", version: "v2.1", status: "active", params: {}, builtin: true, updatedAt: BASE_TIME },
  { id: "r-budget", kind: "budget", name: "Lọc theo ngân sách học phí", description: "Loại các chương trình có học phí thấp nhất vượt ngân sách người dùng đặt quá mức cho phép.", version: "v1.3", status: "active", params: { tolerance: 0 }, builtin: true, updatedAt: "2026-08-10T00:00:00.000Z" },
  { id: "r-diversity", kind: "diversity", name: "Đa dạng kết quả", description: "Giới hạn số chương trình cùng ngành và cùng trường trong danh sách gợi ý.", version: "v1.0", status: "active", params: { perMajor: 2, perSchool: 2, goalMajor: 3 }, builtin: true, updatedAt: BASE_TIME },
  { id: "r-goal", kind: "goal-priority", name: "Ưu tiên ngành mục tiêu", description: "Chương trình thuộc ngành mục tiêu lên trước, rồi tới ngành cùng nhóm.", version: "v1.0", status: "active", params: {}, builtin: true, updatedAt: BASE_TIME },
  { id: "r-min-years", kind: "min-years", name: "Đủ năm điểm chuẩn mới gắn nhãn", description: "Chỉ gắn An toàn / Vừa sức / Thử sức khi chương trình có đủ số năm điểm chuẩn tối thiểu.", version: "v1.0", status: "active", params: { years: 3 }, builtin: true, updatedAt: BASE_TIME },
  { id: "r-boost-cutoff", kind: "boost-cutoff", name: "Boost trường top theo điểm chuẩn", description: "Cộng điểm ưu tiên cho chương trình có điểm chuẩn năm ngoái sát điểm của học sinh.", version: "v3.0-draft", status: "draft", params: { gap: 0.5, points: 5 }, builtin: true, updatedAt: "2026-09-23T00:00:00.000Z" },
];

export function defaultRecommendConfig(): RecommendConfig {
  return { weights: { ...DEFAULT_REC_WEIGHTS }, rules: structuredClone(DEFAULT_RULES), updatedAt: null };
}

export interface EffectiveRecommendConfig {
  /** Trọng số dạng phân số (tổng = 1). */
  weights: { interest: number; fit: number; place: number; group: number };
  useTypeWeights: boolean;
  budgetTolerance: number | null;
  diversity: { perMajor: number; perSchool: number; goalMajor: number } | null;
  goalPriority: boolean;
  minYears: number;
  boostCutoff: { gap: number; points: number } | null;
  boostSchoolTypes: { type: SchoolType; points: number }[];
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export function toEffective(cfg: RecommendConfig): EffectiveRecommendConfig {
  const active = (k: RecRuleKind) => cfg.rules.find((r) => r.kind === k && r.status === "active");
  const sum = cfg.weights.interest + cfg.weights.fit + cfg.weights.place + cfg.weights.group || 100;
  const budget = active("budget");
  const div = active("diversity");
  const years = active("min-years");
  const boost = active("boost-cutoff");
  return {
    weights: { interest: cfg.weights.interest / sum, fit: cfg.weights.fit / sum, place: cfg.weights.place / sum, group: cfg.weights.group / sum },
    useTypeWeights: !!active("riasec-match"),
    budgetTolerance: budget ? num(budget.params.tolerance, 0) : null,
    diversity: div ? { perMajor: num(div.params.perMajor, 2), perSchool: num(div.params.perSchool, 2), goalMajor: num(div.params.goalMajor, 3) } : null,
    goalPriority: !!active("goal-priority"),
    minYears: years ? num(years.params.years, 3) : 1,
    boostCutoff: boost ? { gap: num(boost.params.gap, 0.5), points: num(boost.params.points, 5) } : null,
    boostSchoolTypes: cfg.rules
      .filter((r) => r.kind === "boost-school-type" && r.status === "active")
      .map((r) => ({ type: (String(r.params.schoolType) as SchoolType) || "cong-lap", points: num(r.params.points, 3) })),
  };
}

export async function loadRecommendConfig(): Promise<RecommendConfig> {
  const saved = await repositories.recommendConfig.get();
  if (!saved) return defaultRecommendConfig();
  // Bổ sung quy tắc gốc mới (nếu có) mà cấu hình đã lưu chưa có.
  const ids = new Set(saved.rules.map((r) => r.id));
  return { ...saved, rules: [...saved.rules, ...DEFAULT_RULES.filter((r) => !ids.has(r.id)).map((r) => structuredClone(r))] };
}

export async function effectiveRecommendConfig(): Promise<EffectiveRecommendConfig> {
  return toEffective(await loadRecommendConfig());
}

/** Trọng số nhóm Holland (A06) — 1.0 nếu chưa cấu hình. */
export async function riasecTypeWeights(): Promise<Record<RiasecType, number>> {
  const cfg = await repositories.quizConfig.get();
  return { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1, ...(cfg?.typeWeights ?? {}) };
}

type Fail = { ok: false; status: number; message: string; field?: string };

const PARAM_RULES: Record<RecRuleKind, Record<string, { min: number; max: number } | { options: string[] }>> = {
  "riasec-match": {},
  budget: { tolerance: { min: 0, max: 100 } },
  diversity: { perMajor: { min: 1, max: 6 }, perSchool: { min: 1, max: 6 }, goalMajor: { min: 1, max: 6 } },
  "goal-priority": {},
  "min-years": { years: { min: 1, max: 5 } },
  "boost-cutoff": { gap: { min: 0.1, max: 3 }, points: { min: 1, max: 20 } },
  "boost-school-type": { schoolType: { options: ["cong-lap", "tu-thuc", "quoc-te"] }, points: { min: 1, max: 20 } },
};

export const PARAM_LABELS: Record<string, string> = {
  tolerance: "Vượt ngân sách tối đa (%)",
  perMajor: "Tối đa chương trình / ngành",
  perSchool: "Tối đa chương trình / trường",
  goalMajor: "Tối đa cho ngành mục tiêu",
  years: "Số năm điểm chuẩn tối thiểu",
  gap: "Chênh lệch điểm tối đa",
  points: "Điểm cộng",
  schoolType: "Loại hình trường",
};

const isFail = (v: unknown): v is Fail => !!v && typeof v === "object" && (v as { ok?: unknown }).ok === false;

function cleanParams(kind: RecRuleKind, input: unknown): Record<string, number | string> | Fail {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, number | string> = {};
  for (const [k, rule] of Object.entries(PARAM_RULES[kind])) {
    const v = src[k];
    if ("options" in rule) {
      if (typeof v !== "string" || !rule.options.includes(v)) return { ok: false, status: 400, field: k, message: `${PARAM_LABELS[k]} không hợp lệ.` };
      out[k] = v;
    } else {
      const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
      if (typeof n !== "number" || !Number.isFinite(n) || n < rule.min || n > rule.max) return { ok: false, status: 400, field: k, message: `${PARAM_LABELS[k]} phải từ ${rule.min} đến ${rule.max}.` };
      out[k] = Math.round(n * 100) / 100;
    }
  }
  return out;
}

const bumpVersion = (v: string) => {
  const m = /^v(\d+)\.(\d+)/.exec(v);
  return m ? `v${m[1]}.${Number(m[2]) + 1}` : "v1.1";
};

async function audit(actor: PublicUser, action: "update" | "create" | "delete", field: string, before: string, after: string) {
  await repositories.audit.append({ id: randomUUID(), at: now(), actorId: actor.id, actorEmail: actor.email, programId: "recommend-config", targetType: "rules", action, changes: [{ field, before, after }] });
}

export const rulesService = {
  get: loadRecommendConfig,

  async saveWeights(actor: PublicUser, input: unknown): Promise<{ ok: true } | Fail> {
    const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const w = { interest: 0, fit: 0, place: 0, group: 0 };
    for (const k of Object.keys(w) as (keyof typeof w)[]) {
      const v = Number(src[k]);
      if (!Number.isInteger(v) || v < 0 || v > 100) return { ok: false, status: 400, field: k, message: `Trọng số "${WEIGHT_LABELS[k]}" phải là số nguyên 0–100.` };
      w[k] = v;
    }
    if (w.interest + w.fit + w.place + w.group !== 100) return { ok: false, status: 400, message: "Tổng trọng số phải bằng 100%." };
    const cfg = await loadRecommendConfig();
    const before = `${cfg.weights.interest}/${cfg.weights.fit}/${cfg.weights.place}/${cfg.weights.group}`;
    await repositories.recommendConfig.save({ ...cfg, weights: w, updatedAt: now() });
    await audit(actor, "update", "Trọng số gợi ý (RIASEC/điểm/khu vực/nhóm ngành)", before, `${w.interest}/${w.fit}/${w.place}/${w.group}`);
    return { ok: true };
  },

  /** Sửa tham số / đổi trạng thái / sao chép / tạo / xoá quy tắc. */
  async ruleAction(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; id?: string } | Fail> {
    const cfg = await loadRecommendConfig();
    const action = String(input.action ?? "");
    const id = typeof input.id === "string" ? input.id : "";
    const rule = cfg.rules.find((r) => r.id === id);
    const save = async (rules: RecRule[], field: string, before: string, after: string, act: "update" | "create" | "delete" = "update") => {
      await repositories.recommendConfig.save({ ...cfg, rules, updatedAt: now() });
      await audit(actor, act, field, before, after);
    };
    if (action === "create") {
      const kind = input.kind as RecRuleKind;
      if (!CREATABLE_KINDS.includes(kind)) return { ok: false, status: 400, field: "kind", message: "Loại quy tắc không hợp lệ." };
      const name = String(input.name ?? "").trim().slice(0, 80);
      if (name.length < 4) return { ok: false, status: 400, field: "name", message: "Đặt tên quy tắc (ít nhất 4 ký tự)." };
      const params = cleanParams(kind, input.params);
      if (isFail(params)) return params;
      if (cfg.rules.length >= 40) return { ok: false, status: 400, message: "Đã đạt số quy tắc tối đa (40)." };
      const r: RecRule = { id: `r-${randomUUID().slice(0, 8)}`, kind, name, description: String(input.description ?? "").trim().slice(0, 240) || "Quy tắc do quản trị viên thêm.", version: "v1.0-draft", status: "draft", params, builtin: false, updatedAt: now() };
      await save([...cfg.rules, r], `Thêm quy tắc "${name}"`, "—", "Bản nháp", "create");
      return { ok: true, id: r.id };
    }
    if (!rule) return { ok: false, status: 404, message: "Không tìm thấy quy tắc." };
    if (action === "configure") {
      const params = cleanParams(rule.kind, input.params);
      if (isFail(params)) return params;
      const next = { ...rule, params, version: bumpVersion(rule.version), updatedAt: now() };
      await save(cfg.rules.map((r) => (r.id === id ? next : r)), `Cấu hình "${rule.name}"`, JSON.stringify(rule.params), JSON.stringify(params));
      return { ok: true };
    }
    if (action === "status") {
      const status = input.status as RecRuleStatus;
      if (!["active", "draft", "disabled"].includes(status)) return { ok: false, status: 400, message: "Trạng thái không hợp lệ." };
      let rules = cfg.rules.map((r) => (r.id === id ? { ...r, status, version: status === "active" ? r.version.replace(/-draft$/, "") : r.version, updatedAt: now() } : r));
      // Loại chỉ có một bản: bật bản này thì tắt bản đang chạy.
      if (status === "active" && SINGLETON.includes(rule.kind)) rules = rules.map((r) => (r.id !== id && r.kind === rule.kind && r.status === "active" ? { ...r, status: "disabled" as const, updatedAt: now() } : r));
      await save(rules, `Trạng thái "${rule.name}"`, rule.status, status);
      return { ok: true };
    }
    if (action === "duplicate") {
      const copy: RecRule = { ...structuredClone(rule), id: `r-${randomUUID().slice(0, 8)}`, name: `${rule.name} (bản sao)`.slice(0, 80), status: "draft", builtin: false, version: `${rule.version.replace(/-draft$/, "")}-draft`, updatedAt: now() };
      await save([...cfg.rules, copy], `Sao chép "${rule.name}"`, "—", copy.name, "create");
      return { ok: true, id: copy.id };
    }
    if (action === "delete") {
      if (rule.builtin) return { ok: false, status: 400, message: "Quy tắc gốc chỉ có thể vô hiệu hoá, không xoá." };
      await save(cfg.rules.filter((r) => r.id !== id), `Xoá quy tắc "${rule.name}"`, rule.status, "—", "delete");
      return { ok: true };
    }
    return { ok: false, status: 400, message: "Thao tác không hợp lệ." };
  },

  /**
   * Chạy thử: hồ sơ mẫu + trọng số đang chỉnh (chưa lưu) → top 3 gợi ý.
   * includeDrafts = coi các quy tắc bản nháp như đang chạy để xem tác động trước khi bật.
   */
  async simulate(input: Record<string, unknown>) {
    const cfg = await loadRecommendConfig();
    const src = (input.weights && typeof input.weights === "object" ? input.weights : {}) as Record<string, unknown>;
    const w = { ...cfg.weights };
    for (const k of Object.keys(w) as (keyof typeof w)[]) {
      const v = Number(src[k]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) w[k] = Math.round(v);
    }
    const rules = input.includeDrafts === true ? cfg.rules.map((r) => (r.status === "draft" ? { ...r, status: "active" as const } : r)) : cfg.rules;
    const eff = toEffective({ ...cfg, weights: w, rules });
    const letters = [...new Set(String(input.code ?? "").toUpperCase().replace(/[^RIASEC]/g, "").split(""))].slice(0, 3) as RiasecType[];
    const order: RiasecType[] = ["R", "I", "A", "S", "E", "C"];
    const code = (letters.length === 3 ? letters : (["I", "A", "S"] as RiasecType[])) as [RiasecType, RiasecType, RiasecType];
    const percents = Object.fromEntries(order.map((t) => [t, t === code[0] ? 90 : t === code[1] ? 75 : t === code[2] ? 60 : 30])) as Record<RiasecType, number>;
    const total = Number(String(input.score ?? "").replace(",", "."));
    const combo = typeof input.combo === "string" && /^[A-Z]\d{2}$/.test(input.combo) ? input.combo : "A00";
    const budget = Number(input.budget);
    const regions = (["bac", "trung", "nam"] as const).filter((r) => r === input.region);
    const { recommendationService } = await import("./recommendation.service");
    const res = await recommendationService.recommend(
      {
        riasec: { percents, code },
        score: Number.isFinite(total) && total > 0 && total <= 30 ? { method: "thpt", total, combo } : null,
        budgetMax: Number.isFinite(budget) && budget > 0 ? budget : null,
        regions: regions.length ? [...regions] : undefined,
      },
      3,
      eff,
    );
    return {
      code: code.join(""),
      items: res.items.map((r) => ({
        id: r.view.program.id,
        slug: r.view.program.slug,
        name: r.view.program.name,
        school: r.view.school.shortName,
        major: r.view.major.name,
        cutoff: r.view.latestCutoff,
        tuitionMin: r.view.program.tuitionMin,
        match: r.score,
        reasons: r.reasons.slice(0, 2),
      })),
    };
  },
};

export { PARAM_RULES };
