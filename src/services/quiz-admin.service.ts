/**
 * SERVICE LAYER — A06 Bài test RIASEC: sửa nội dung/nhóm câu hỏi, tạm ẩn, thêm câu mới, trọng số theo nhóm, xuất JSON.
 * Câu gốc không bị sửa trực tiếp (lưu phần ghi đè); mỗi nhóm luôn giữ tối thiểu MIN_PER_TYPE câu đang dùng.
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, QuizConfig, RiasecQuestion, RiasecType } from "../domain/types";
import { RIASEC_ORDER } from "../domain/riasec";
import { repositories } from "../repositories";

type Fail = { ok: false; status: number; field?: string; message: string };
const now = () => new Date().toISOString();
export const MIN_PER_TYPE = 3;
export const MAX_CUSTOM = 60;
const CUSTOM_START = 1000;
const DEFAULT_WEIGHTS: Record<RiasecType, number> = { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 };

const blank = (): QuizConfig => ({ overrides: {}, custom: [], typeWeights: { ...DEFAULT_WEIGHTS }, updatedAt: null });
const cleanText = (v: unknown) => String(v ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim();
const isType = (v: unknown): v is RiasecType => typeof v === "string" && (RIASEC_ORDER as string[]).includes(v);

async function audit(actor: PublicUser, action: "update" | "create", field: string, before: string, after: string) {
  await repositories.audit.append({ id: randomUUID(), at: now(), actorId: actor.id, actorEmail: actor.email, programId: "riasec-quiz", targetType: "quiz", action, changes: [{ field, before, after }] });
}

function perType(questions: RiasecQuestion[]) {
  const out = Object.fromEntries(RIASEC_ORDER.map((t) => [t, 0])) as Record<RiasecType, number>;
  for (const q of questions) if (!q.hidden) out[q.type]++;
  return out;
}

export const quizAdminService = {
  async get() {
    const [cfg, questions] = await Promise.all([repositories.quizConfig.get(), repositories.quizConfig.listAll()]);
    const c = cfg ?? blank();
    return { questions, counts: perType(questions), typeWeights: { ...DEFAULT_WEIGHTS, ...c.typeWeights }, updatedAt: c.updatedAt, edited: new Set(Object.keys(c.overrides).map(Number)) };
  },

  /** action: edit | hide | show | add */
  async question(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; id?: number } | Fail> {
    const cfg = (await repositories.quizConfig.get()) ?? blank();
    const all = await repositories.quizConfig.listAll();
    const action = String(input.action ?? "");
    if (action === "add") {
      const text = cleanText(input.text);
      if (text.length < 10 || text.length > 160) return { ok: false, status: 400, field: "text", message: "Nội dung câu hỏi 10–160 ký tự." };
      if (!isType(input.type)) return { ok: false, status: 400, field: "type", message: "Chọn nhóm RIASEC." };
      if (cfg.custom.length >= MAX_CUSTOM) return { ok: false, status: 400, message: `Tối đa ${MAX_CUSTOM} câu thêm mới.` };
      if (all.some((q) => q.text.toLowerCase() === text.toLowerCase())) return { ok: false, status: 409, field: "text", message: "Câu hỏi này đã có." };
      const id = Math.max(CUSTOM_START - 1, ...cfg.custom.map((q) => q.id)) + 1;
      await repositories.quizConfig.save({ ...cfg, custom: [...cfg.custom, { id, type: input.type, text, custom: true }], updatedAt: now() });
      await audit(actor, "create", `Thêm câu #${id} (${input.type})`, "—", text);
      return { ok: true, id };
    }
    const id = Number(input.id);
    const q = all.find((x) => x.id === id);
    if (!q) return { ok: false, status: 404, message: "Không tìm thấy câu hỏi." };
    const isCustom = id >= CUSTOM_START;
    const apply = (patch: { text?: string; type?: RiasecType; hidden?: boolean }): QuizConfig =>
      isCustom
        ? { ...cfg, custom: cfg.custom.map((x) => (x.id === id ? { ...x, ...patch } : x)), updatedAt: now() }
        : { ...cfg, overrides: { ...cfg.overrides, [id]: { ...(cfg.overrides[id] ?? {}), ...patch } }, updatedAt: now() };

    if (action === "hide" || action === "show") {
      const hidden = action === "hide";
      if (hidden && !q.hidden && perType(all)[q.type] <= MIN_PER_TYPE) return { ok: false, status: 400, message: `Nhóm ${q.type} cần ít nhất ${MIN_PER_TYPE} câu đang dùng.` };
      await repositories.quizConfig.save(apply({ hidden }));
      await audit(actor, "update", `Câu #${id}`, q.hidden ? "Tạm ẩn" : "Đang dùng", hidden ? "Tạm ẩn" : "Đang dùng");
      return { ok: true };
    }
    if (action === "edit") {
      const text = cleanText(input.text);
      if (text.length < 10 || text.length > 160) return { ok: false, status: 400, field: "text", message: "Nội dung câu hỏi 10–160 ký tự." };
      if (!isType(input.type)) return { ok: false, status: 400, field: "type", message: "Chọn nhóm RIASEC." };
      if (input.type !== q.type && !q.hidden && perType(all)[q.type] <= MIN_PER_TYPE) return { ok: false, status: 400, field: "type", message: `Nhóm ${q.type} cần ít nhất ${MIN_PER_TYPE} câu đang dùng.` };
      if (text === q.text && input.type === q.type) return { ok: true };
      await repositories.quizConfig.save(apply({ text, type: input.type }));
      await audit(actor, "update", `Câu #${id}`, `${q.type} · ${q.text}`, `${input.type} · ${text}`);
      return { ok: true };
    }
    if (action === "reset") {
      if (isCustom) return { ok: false, status: 400, message: "Câu thêm mới không có bản gốc." };
      const { [id]: _drop, ...rest } = cfg.overrides;
      await repositories.quizConfig.save({ ...cfg, overrides: rest, updatedAt: now() });
      await audit(actor, "update", `Câu #${id}`, "Đã chỉnh sửa", "Khôi phục bản gốc");
      return { ok: true };
    }
    return { ok: false, status: 400, message: "Thao tác không hợp lệ." };
  },

  /** Trọng số ưu tiên gợi ý theo nhóm (0,5–2,0). */
  async saveWeights(actor: PublicUser, input: unknown): Promise<{ ok: true } | Fail> {
    const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const w = { ...DEFAULT_WEIGHTS };
    for (const t of RIASEC_ORDER) {
      const v = Number(String(src[t] ?? "").replace(",", "."));
      if (!Number.isFinite(v) || v < 0.5 || v > 2) return { ok: false, status: 400, field: t, message: `Trọng số nhóm ${t} phải từ 0,5 đến 2,0.` };
      w[t] = Math.round(v * 10) / 10;
    }
    const cfg = (await repositories.quizConfig.get()) ?? blank();
    const before = RIASEC_ORDER.map((t) => `${t}=${cfg.typeWeights?.[t] ?? 1}`).join(" ");
    await repositories.quizConfig.save({ ...cfg, typeWeights: w, updatedAt: now() });
    await audit(actor, "update", "Trọng số nhóm RIASEC", before, RIASEC_ORDER.map((t) => `${t}=${w[t]}`).join(" "));
    return { ok: true };
  },

  /** Bộ câu hỏi đang dùng (JSON) để lưu trữ / chuyển môi trường. */
  async exportJson() {
    const { questions, typeWeights, updatedAt } = await this.get();
    return { exportedAt: now(), updatedAt, typeWeights, questions: questions.map(({ id, type, text, hidden, custom }) => ({ id, type, text, hidden: !!hidden, custom: !!custom })) };
  },
};
