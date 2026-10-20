/**
 * SERVICE LAYER — dữ liệu cá nhân đồng bộ theo tài khoản (đã lưu, nguyện vọng, hồ sơ điểm, kết quả RIASEC).
 * Khách dùng localStorage; khi đăng nhập, dữ liệu trên máy được GỘP vào tài khoản (không ghi đè).
 */
import type { AdmissionMethodKey, Goal, Region, StoredProfile, StoredQuiz, UserData, WishlistItem } from "../domain/types";
import { repositories } from "@database/repositories";
import { ADMISSION_METHODS, isMethodKey, isValidSubjectScore } from "./scoring.service";
import { sanitizeMbti, sanitizeWorkStyle } from "../domain/work-style";

export const MAX_SAVED = 200;
/** Giới hạn tối đa 15 nguyện vọng theo Thông tư 06/2026/TT-BGDĐT */
export const MAX_WISHLIST = 15;
const MAX_NOTE = 300;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export type UserDataInput = Omit<UserData, "updatedAt">;

export const MAX_REMINDERS = 50;

export const emptyUserData = (): UserData => ({ saved: [], wishlist: [], profile: null, quiz: null, reminders: [], goal: null, workStyle: null, mbti: null, updatedAt: new Date(0).toISOString() });

const REGIONS: Region[] = ["bac", "trung", "nam"];
const COMBO_RE = /^[A-Z]\d{2}$/;

/** Làm sạch mục tiêu (đặt qua hội thoại). Sai kiểu → bỏ trường đó, không làm hỏng cả mục tiêu. */
export function sanitizeGoal(input: unknown): Goal | null {
  if (!isObj(input) || typeof input.updatedAt !== "string" || Number.isNaN(Date.parse(input.updatedAt))) return null;
  const method = isMethodKey(input.method) ? input.method : "thpt";
  const max = ADMISSION_METHODS[method].max;
  const score = typeof input.targetScore === "number" && Number.isFinite(input.targetScore) && input.targetScore > 0 && input.targetScore <= max ? Math.round(input.targetScore * 100) / 100 : null;
  const budget = typeof input.budgetMax === "number" && Number.isFinite(input.budgetMax) && input.budgetMax > 0 && input.budgetMax < 10_000 ? Math.round(input.budgetMax) : null;
  return {
    majorId: typeof input.majorId === "string" && ID_RE.test(input.majorId) ? input.majorId : null,
    method,
    combo: ADMISSION_METHODS[method].needsCombo && typeof input.combo === "string" && COMBO_RE.test(input.combo) ? input.combo : null,
    targetScore: score,
    refProgramId: typeof input.refProgramId === "string" && ID_RE.test(input.refProgramId) ? input.refProgramId : null,
    regions: Array.isArray(input.regions) ? Array.from(new Set(input.regions.filter((r): r is Region => REGIONS.includes(r as Region)))) : [],
    budgetMax: budget,
    updatedAt: new Date(Date.parse(input.updatedAt)).toISOString(),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function sanitizeProfile(input: unknown): StoredProfile | null {
  if (
    !isObj(input) ||
    typeof input.combo !== "string" ||
    !isObj(input.scores) ||
    !isObj(input.admission) ||
    typeof input.admission.total !== "number" ||
    typeof input.admission.rawTotal !== "number" ||
    typeof input.updatedAt !== "string" ||
    (input.method !== undefined && !isMethodKey(input.method))
  ) {
    return null;
  }
  const scores: Record<string, number> = {};
  for (const [key, value] of Object.entries(input.scores)) {
    if (typeof key === "string" && key.length <= 20 && isValidSubjectScore(value)) scores[key] = Math.round(value * 100) / 100;
  }
  const methods = Array.isArray(input.methods) ? Array.from(new Set(input.methods.filter(isMethodKey))) : undefined;
  const interestMajorIds = Array.isArray(input.interestMajorIds)
    ? Array.from(new Set(input.interestMajorIds.filter((id): id is string => typeof id === "string" && ID_RE.test(id)))).slice(0, 20)
    : undefined;
  const profile = input as unknown as StoredProfile;
  return {
    ...profile,
    combo: input.combo.slice(0, 5),
    scores,
    methods: methods?.length ? methods : undefined,
    interestMajorIds: interestMajorIds?.length ? interestMajorIds : undefined,
  };
}
const uniq = <T>(arr: T[], key: (x: T) => string) => {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
};

/** Kiểm tra & làm sạch dữ liệu client gửi lên (không tin client). */
export function sanitizeUserData(input: unknown): UserDataInput {
  const src = isObj(input) ? input : {};
  const saved = uniq(
    (Array.isArray(src.saved) ? src.saved : []).filter((x): x is string => typeof x === "string" && ID_RE.test(x)),
    (x) => x,
  ).slice(0, MAX_SAVED);
  const wishlist = uniq(
    (Array.isArray(src.wishlist) ? src.wishlist : [])
      .filter((w): w is WishlistItem => isObj(w) && typeof w.id === "string" && ID_RE.test(w.id))
      .map((w) => ({ id: w.id, note: typeof w.note === "string" ? w.note.slice(0, MAX_NOTE) : "" })),
    (w) => w.id,
  ).slice(0, MAX_WISHLIST);
  const profile = sanitizeProfile(src.profile);
  const quiz: StoredQuiz | null = null;
  const reminders = uniq(
    (Array.isArray(src.reminders) ? src.reminders : []).filter((x): x is string => typeof x === "string" && ID_RE.test(x)),
    (x) => x,
  ).slice(0, MAX_REMINDERS);
  return { saved, wishlist, profile, quiz, reminders, goal: sanitizeGoal(src.goal), workStyle: sanitizeWorkStyle(src.workStyle), mbti: sanitizeMbti(src.mbti) };
}

const newer = <T>(a: T | null, b: T | null, at: (x: T) => string): T | null => {
  if (!a) return b;
  if (!b) return a;
  return at(b) > at(a) ? b : a;
};

/**
 * Gộp dữ liệu trên máy (khách) vào dữ liệu tài khoản:
 * - Đã lưu / nguyện vọng: hợp nhất, giữ thứ tự của tài khoản, mục mới từ máy nối vào cuối.
 * - Ghi chú: giữ ghi chú của tài khoản, chỉ lấy từ máy nếu tài khoản đang trống.
 * - Hồ sơ điểm, kết quả trắc nghiệm, mini-test phong cách, mã MBTI: lấy bản mới hơn.
 */
export function mergeUserData(server: UserDataInput, local: UserDataInput): UserDataInput {
  const saved = uniq([...server.saved, ...local.saved], (x) => x).slice(0, MAX_SAVED);
  const localNotes = new Map(local.wishlist.map((w) => [w.id, w.note]));
  const wishlist = uniq(
    [...server.wishlist.map((w) => ({ ...w, note: w.note || localNotes.get(w.id) || "" })), ...local.wishlist],
    (w) => w.id,
  ).slice(0, MAX_WISHLIST);
  const profile = newer(server.profile, local.profile, (x) => x.updatedAt);
  let quiz = newer(server.quiz, local.quiz, (x) => x.result.completedAt);
  if (quiz && server.quiz && local.quiz && server.quiz.result.completedAt === local.quiz.result.completedAt) {
    quiz = { ...quiz, savedToProfile: server.quiz.savedToProfile || local.quiz.savedToProfile };
  }
  // Mục trong nguyện vọng luôn nằm trong danh sách đã lưu.
  for (const w of wishlist) if (!saved.includes(w.id)) saved.push(w.id);
  const reminders = uniq([...server.reminders, ...local.reminders], (x) => x).slice(0, MAX_REMINDERS);
  const goal = newer(server.goal ?? null, local.goal ?? null, (x) => x.updatedAt);
  const workStyle = newer(server.workStyle ?? null, local.workStyle ?? null, (x) => x.completedAt);
  const mbti = newer(server.mbti ?? null, local.mbti ?? null, (x) => x.updatedAt);
  return { saved, wishlist, profile, quiz, reminders, goal, workStyle, mbti };
}

async function onlyExistingPrograms(data: UserDataInput): Promise<UserDataInput> {
  const ids = Array.from(new Set([...data.saved, ...data.wishlist.map((w) => w.id)]));
  const existing = new Set((await repositories.programs.findByIds(ids)).map((p) => p.id));
  return { ...data, saved: data.saved.filter((id) => existing.has(id)), wishlist: data.wishlist.filter((w) => existing.has(w.id)) };
}

export const userDataService = {
  async get(userId: string): Promise<UserData> {
    const data = await repositories.userData.get(userId);
    // Dữ liệu lưu từ phiên bản cũ chưa có `reminders`.
    return data ? { ...emptyUserData(), ...data, reminders: data.reminders ?? [], goal: data.goal ?? null, workStyle: data.workStyle ?? null, mbti: data.mbti ?? null } : emptyUserData();
  },

  async replace(userId: string, input: unknown): Promise<UserData> {
    const clean = await onlyExistingPrograms(sanitizeUserData(input));
    return repositories.userData.put(userId, { ...clean, updatedAt: new Date().toISOString() });
  },

  /** Gọi ngay sau khi đăng nhập: gộp dữ liệu khách vào tài khoản, trả về bản đã gộp. */
  async mergeLocal(userId: string, local: unknown): Promise<{ data: UserData; added: number }> {
    const server = await this.get(userId);
    const merged = await onlyExistingPrograms(mergeUserData(server, sanitizeUserData(local)));
    const added = merged.saved.filter((id) => !server.saved.includes(id)).length + merged.wishlist.filter((w) => !server.wishlist.some((s) => s.id === w.id)).length;
    const data = await repositories.userData.put(userId, { ...merged, updatedAt: new Date().toISOString() });
    return { data, added };
  },
};
