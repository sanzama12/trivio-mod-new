/**
 * DOMAIN — Mini-test "Phong cách làm việc" (12 tình huống, 4 trục) + góc nhìn MBTI tham khảo.
 *
 * Nguyên tắc: kết quả CHỈ dùng để giải thích thêm vì sao một ngành hợp với học sinh.
 * Không module nào trong công thức điểm phù hợp (recommendation/scoring) được import file này.
 * Thuần TypeScript, không phụ thuộc server → dùng được cả ở client (store) và service (làm sạch dữ liệu).
 */
import type { Major, StoredMbti, StoredWorkStyle, WorkAxis } from "./types";

export type { StoredMbti, StoredWorkStyle, WorkAxis } from "./types";

export const WORK_AXES: readonly WorkAxis[] = ["social", "stability", "hands", "detail"];
/** +1 = cực trái (A), −1 = cực phải (B). */
export type Pole = 1 | -1;

export interface AxisInfo {
  left: string;
  right: string;
  leftShort: string;
  rightShort: string;
  /** Cụm ngắn dùng trong câu giải thích: "thích ổn định, chi tiết". */
  leftWord: string;
  rightWord: string;
  /** Mô tả người dùng trong câu tóm tắt. */
  leftTrait: string;
  rightTrait: string;
  /** Ngành nghiêng về cực này thường… (dùng ở ngăn "Vì sao gợi ý?"). */
  leftMajor: string;
  rightMajor: string;
}

export const AXIS_INFO: Record<WorkAxis, AxisInfo> = {
  social: {
    left: "Làm cùng mọi người",
    right: "Làm độc lập",
    leftShort: "Cùng mọi người",
    rightShort: "Độc lập",
    leftWord: "làm nhóm",
    rightWord: "làm độc lập",
    leftTrait: "thích làm cùng mọi người",
    rightTrait: "thích làm độc lập",
    leftMajor: "thường làm việc nhóm, trao đổi với nhiều người",
    rightMajor: "cần nhiều thời gian tập trung làm việc một mình",
  },
  stability: {
    left: "Ổn định",
    right: "Thay đổi",
    leftShort: "Ổn định",
    rightShort: "Thay đổi",
    leftWord: "ổn định",
    rightWord: "thay đổi",
    leftTrait: "ưa sự ổn định",
    rightTrait: "thích thay đổi, thử thách mới",
    leftMajor: "thường có quy trình, lịch làm việc đều đặn",
    rightMajor: "thay đổi nhanh, nhiều việc mới phải thích nghi",
  },
  hands: {
    left: "Thực hành, hiện trường",
    right: "Máy tính, tài liệu",
    leftShort: "Thực hành",
    rightShort: "Máy tính",
    leftWord: "thực hành",
    rightWord: "làm trên máy tính",
    leftTrait: "thích thực hành, làm trực tiếp",
    rightTrait: "thích làm việc trên máy tính",
    leftMajor: "nhiều giờ thực hành, làm ở hiện trường hoặc phòng thí nghiệm",
    rightMajor: "phần lớn thời gian làm việc trên máy tính, tài liệu",
  },
  detail: {
    left: "Chi tiết, cẩn thận",
    right: "Ý tưởng, sáng tạo",
    leftShort: "Chi tiết",
    rightShort: "Ý tưởng",
    leftWord: "chi tiết",
    rightWord: "sáng tạo ý tưởng",
    leftTrait: "rất để ý chi tiết",
    rightTrait: "thích nghĩ ý tưởng mới",
    leftMajor: "đòi hỏi cẩn thận, chính xác đến từng chi tiết",
    rightMajor: "cần nhiều ý tưởng và cách nghĩ mới",
  },
};

export interface WorkStyleQuestion {
  id: string;
  axis: WorkAxis;
  prompt: string;
  /** Lựa chọn nghiêng về cực trái (+1). */
  a: string;
  /** Lựa chọn nghiêng về cực phải (−1). */
  b: string;
  /** Đảo thứ tự hiển thị (B lên trước) để tránh thói quen luôn chọn ô đầu. */
  flip?: boolean;
}

/** 12 tình huống, xếp xen kẽ trục. */
export const WORK_STYLE_QUESTIONS: readonly WorkStyleQuestion[] = [
  { id: "so1", axis: "social", prompt: "Cô giao bài thuyết trình lớn, hạn 2 tuần. Bạn muốn…", a: "Chia việc cho cả nhóm, họp bàn thường xuyên", b: "Tự nhận một phần rõ ràng và làm riêng cho xong" },
  { id: "st1", axis: "stability", prompt: "Lịch học thêm buổi tối, bạn thích kiểu nào hơn?", a: "Lịch cố định — tuần nào cũng biết trước học gì, lúc nào", b: "Mỗi tuần một kiểu, có thêm buổi mới thì càng thú vị" },
  { id: "ha1", axis: "hands", prompt: "Làm dự án môn Khoa học, bạn muốn nhận phần…", a: "Tự tay lắp ráp, đo đạc, làm thí nghiệm", b: "Tìm tài liệu, xử lý số liệu, làm slide trên máy" },
  { id: "de1", axis: "detail", prompt: "Trong bài tập nhóm, bạn thích nhận phần…", a: "Kiểm tra lỗi, soát số liệu, hoàn thiện từng chi tiết", b: "Nghĩ ý tưởng, đề xuất hướng đi cho cả nhóm" },
  { id: "so2", axis: "social", prompt: "Gặp bài tập khó lúc ở nhà, bạn thường…", a: "Nhắn bạn bè để cùng bàn cách giải", b: "Tự mày mò, tra cứu đến khi hiểu", flip: true },
  { id: "st2", axis: "stability", prompt: "Cuối tuần đi chơi với nhóm bạn, bạn thích…", a: "Lên kế hoạch kỹ: đi đâu, mấy giờ, ăn gì", b: "Đến đâu tính đến đó, gặp gì hay thì ghé", flip: true },
  { id: "ha2", axis: "hands", prompt: "Bạn thấy hứng thú hơn khi được…", a: "Ra ngoài, đến tận nơi xem và làm trực tiếp", b: "Ngồi máy tính, tìm hiểu và xử lý thông tin" },
  { id: "de2", axis: "detail", prompt: "Nhận một món đồ cần tự lắp, bạn sẽ…", a: "Đọc kỹ hướng dẫn, làm đúng từng bước", b: "Xem qua hình rồi tự tìm cách lắp" },
  { id: "so3", axis: "social", prompt: "Một ngày làm việc lý tưởng sau này của bạn có…", a: "Nhiều trò chuyện, gặp gỡ, phối hợp với người khác", b: "Nhiều thời gian yên tĩnh để tập trung vào việc của mình" },
  { id: "st3", axis: "stability", prompt: "Nghĩ về công việc sau này, bạn coi trọng điều gì hơn?", a: "Ổn định, rõ ràng, ít rủi ro", b: "Nhiều thử thách mới, được thay đổi thường xuyên" },
  { id: "ha3", axis: "hands", prompt: "Sau một dự án, điều khiến bạn tự hào hơn là…", a: "Một món đồ, công trình mình chạm vào được", b: "Một bản thiết kế, file phân tích hay sản phẩm số", flip: true },
  { id: "de3", axis: "detail", prompt: "Bạn muốn được khen vì điều gì hơn?", a: "Cẩn thận, chính xác, hầu như không sai sót", b: "Sáng tạo, hay nghĩ ra cách mới", flip: true },
];

export type WorkStyleChoice = "a" | "b";
export type WorkStyleScores = Record<WorkAxis, number>;

const AXIS_VALUES = new Set([-3, -1, 1, 3]);

/** Chấm điểm: mỗi trục 3 câu, A = +1, B = −1 → {−3, −1, +1, +3}. Thiếu câu → null. */
export function scoreWorkStyle(answers: Partial<Record<string, WorkStyleChoice>>): WorkStyleScores | null {
  const scores: WorkStyleScores = { social: 0, stability: 0, hands: 0, detail: 0 };
  for (const q of WORK_STYLE_QUESTIONS) {
    const v = answers[q.id];
    if (v !== "a" && v !== "b") return null;
    scores[q.axis] += v === "a" ? 1 : -1;
  }
  return scores;
}

export const poleOf = (score: number): Pole => (score > 0 ? 1 : -1);
export const isStrong = (score: number) => Math.abs(score) >= 3;

const sideLabel = (axis: WorkAxis, pole: Pole) => (pole === 1 ? AXIS_INFO[axis].left : AXIS_INFO[axis].right);
const word = (axis: WorkAxis, pole: Pole) => (pole === 1 ? AXIS_INFO[axis].leftWord : AXIS_INFO[axis].rightWord);
const trait = (axis: WorkAxis, pole: Pole) => (pole === 1 ? AXIS_INFO[axis].leftTrait : AXIS_INFO[axis].rightTrait);

/** "a, b và c" */
export function joinVi(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} và ${items[items.length - 1]}`;
}

/** "Nghiêng rõ về làm cùng mọi người · 3/3 tình huống" */
export function describeAxis(axis: WorkAxis, score: number): string {
  const strong = isStrong(score);
  return `${strong ? "Nghiêng rõ về" : "Hơi nghiêng về"} ${sideLabel(axis, poleOf(score)).toLowerCase()} · ${strong ? 3 : 2}/3 tình huống`;
}

/** Câu tóm tắt: "Bạn thích làm cùng mọi người, rất để ý chi tiết, hơi ưa sự ổn định và hơi thích làm việc trên máy tính." */
export function summarizeWorkStyle(scores: WorkStyleScores): string {
  const strong = WORK_AXES.filter((a) => isStrong(scores[a])).map((a) => trait(a, poleOf(scores[a])));
  const slight = WORK_AXES.filter((a) => !isStrong(scores[a])).map((a) => `hơi ${trait(a, poleOf(scores[a]))}`);
  const all = [...strong, ...slight];
  const tail = strong.length === 0 ? " — không quá rõ ở trục nào, tức là bạn khá linh hoạt" : "";
  return `Bạn ${joinVi(all)}${tail}.`;
}

/** Nhãn ngắn của cực người dùng nghiêng về (VD "Ổn định", "Máy tính"). */
export const leanShort = (axis: WorkAxis, score: number) => (poleOf(score) === 1 ? AXIS_INFO[axis].leftShort : AXIS_INFO[axis].rightShort);

// ---------------------------------------------------------------------------------------------
// Hồ sơ phong cách của ngành: chỉ ghi các trục ngành có xu hướng RÕ (1–3 trục). Trục không ghi = trung tính.
// ---------------------------------------------------------------------------------------------
export type StyleProfile = Partial<Record<WorkAxis, Pole>>;

/** Mặc định theo nhóm ngành (dùng cho ngành mới quản trị viên thêm). */
export const GROUP_STYLE: Record<string, StyleProfile> = {
  cntt: { hands: -1, detail: 1 },
  "kinh-te": { social: 1 },
  "y-duoc": { hands: 1, detail: 1 },
  "ky-thuat": { hands: 1, detail: 1 },
  "xa-hoi": { social: 1 },
  "nghe-thuat": { detail: -1, stability: -1 },
  "giao-duc": { social: 1, stability: 1 },
  "nong-lam": { hands: 1 },
};

/** Ghi đè theo từng ngành (slug). */
export const MAJOR_STYLE: Record<string, StyleProfile> = {
  "cong-nghe-thong-tin": { hands: -1, detail: 1 },
  "khoa-hoc-may-tinh": { hands: -1, social: -1 },
  "ky-thuat-phan-mem": { hands: -1, detail: 1, social: 1 },
  "tri-tue-nhan-tao": { hands: -1, stability: -1 },
  marketing: { social: 1, stability: -1, detail: -1 },
  "quan-tri-kinh-doanh": { social: 1, stability: -1 },
  "kinh-doanh-quoc-te": { social: 1, stability: -1 },
  "tai-chinh-ngan-hang": { stability: 1, detail: 1, hands: -1 },
  "ke-toan": { stability: 1, detail: 1, hands: -1 },
  "quan-tri-du-lich": { social: 1, hands: 1, stability: -1 },
  "y-khoa": { social: 1, hands: 1, detail: 1 },
  "duoc-hoc": { detail: 1, stability: 1, hands: 1 },
  "ky-thuat-dien": { hands: 1, detail: 1 },
  "ky-thuat-co-khi": { hands: 1, detail: 1 },
  "kien-truc": { detail: -1, stability: -1 },
  "thiet-ke-do-hoa": { detail: -1, hands: -1, stability: -1 },
  "tam-ly-hoc": { social: 1 },
  luat: { detail: 1, stability: 1 },
  "quan-he-cong-chung": { social: 1, stability: -1, detail: -1 },
  "su-pham-toan": { social: 1, stability: 1 },
  "cong-nghe-thuc-pham": { hands: 1, detail: 1 },
  "khoa-hoc-moi-truong": { hands: 1 },
};

export function majorStyleProfile(major: Pick<Major, "slug" | "groupId">): StyleProfile {
  return MAJOR_STYLE[major.slug] ?? GROUP_STYLE[major.groupId] ?? {};
}

export interface StyleMatch {
  matched: WorkAxis[];
  unmatched: WorkAxis[];
  total: number;
  profile: StyleProfile;
}

/** So phong cách người dùng với hồ sơ ngành. null nếu ngành không có xu hướng rõ ở trục nào. */
export function matchWorkStyle(scores: WorkStyleScores, major: Pick<Major, "slug" | "groupId">): StyleMatch | null {
  const profile = majorStyleProfile(major);
  const axes = WORK_AXES.filter((a) => profile[a] !== undefined);
  if (axes.length === 0) return null;
  const matched = axes.filter((a) => poleOf(scores[a]) === profile[a]);
  return { matched, unmatched: axes.filter((a) => !matched.includes(a)), total: axes.length, profile };
}

const majorWords = (m: StyleMatch, axes: WorkAxis[]) => axes.map((a) => word(a, m.profile[a]!)).join(", ");

/** Dòng ngắn trên thẻ gợi ý: "Khớp 2/2 — thích ổn định, chi tiết của bạn cũng hợp ngành này." */
export function styleLine(m: StyleMatch): string {
  const n = m.matched.length;
  if (n === m.total) return `Khớp ${n}/${m.total} — thích ${majorWords(m, m.matched)} của bạn cũng hợp ngành này.`;
  if (n === 0) return `Khớp 0/${m.total} — ngành thiên về ${majorWords(m, m.unmatched)}, khác phong cách của bạn.`;
  return `Khớp ${n}/${m.total} — hợp ở ${majorWords(m, m.matched)}; ngành thiên về ${majorWords(m, m.unmatched)} hơn bạn.`;
}

/** Câu đầy đủ trên trang kết quả: "Ngành Kế toán hợp mã CEI của bạn, và phong cách thích ổn định, chi tiết của bạn cũng khớp." */
export function styleSentence(majorName: string, code: string, m: StyleMatch): string {
  const head = `Ngành ${majorName} hợp mã ${code} của bạn`;
  const n = m.matched.length;
  if (n === m.total) return `${head}, và phong cách thích ${majorWords(m, m.matched)} của bạn cũng khớp.`;
  if (n === 0) return `${head}, nhưng ngành này thiên về ${majorWords(m, m.unmatched)} — khác phong cách của bạn, nên tìm hiểu kỹ hơn.`;
  return `${head}; phong cách khớp ở ${majorWords(m, m.matched)}, còn ngành này thiên về ${majorWords(m, m.unmatched)} hơn bạn.`;
}

/** Các dòng cho ngăn "Vì sao gợi ý?". */
export function styleReasons(scores: WorkStyleScores, m: StyleMatch): { axis: WorkAxis; ok: boolean; text: string }[] {
  return WORK_AXES.filter((a) => m.profile[a] !== undefined).map((a) => {
    const pole = m.profile[a]!;
    const ok = m.matched.includes(a);
    const info = AXIS_INFO[a];
    const label = pole === 1 ? info.left : info.right;
    const why = pole === 1 ? info.leftMajor : info.rightMajor;
    return { axis: a, ok, text: `${label} — ngành này ${why}. ${ok ? "Bạn cũng vậy." : `Bạn nghiêng về ${sideLabel(a, poleOf(scores[a])).toLowerCase()}.`}` };
  });
}

/** Các trục ngành không nghiêng rõ (để nói thẳng là "không nghiêng rõ"). */
export const neutralAxes = (m: StyleMatch) => WORK_AXES.filter((a) => m.profile[a] === undefined);

// ---------------------------------------------------------------------------------------------
// MBTI — chỉ là GÓC NHÌN THAM KHẢO người dùng tự nhập. Mô tả ngắn do Trovio tự viết.
// ---------------------------------------------------------------------------------------------
export const MBTI_CODES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;
export type MbtiCode = (typeof MBTI_CODES)[number];
export const MBTI_RE = /^[EI][SN][TF][JP]$/;
export const isMbtiCode = (v: unknown): v is MbtiCode => typeof v === "string" && MBTI_RE.test(v);

const MBTI_LETTER: Record<string, { text: string; axis?: WorkAxis; pole?: Pole }> = {
  E: { text: "nạp năng lượng khi ở cùng mọi người", axis: "social", pole: 1 },
  I: { text: "nạp năng lượng khi ở một mình", axis: "social", pole: -1 },
  S: { text: "chú ý điều cụ thể, thực tế", axis: "detail", pole: 1 },
  N: { text: "thích ý tưởng, khả năng mới", axis: "detail", pole: -1 },
  T: { text: "quyết định dựa trên lý lẽ" },
  F: { text: "cân nhắc cảm xúc của mọi người" },
  J: { text: "thích có kế hoạch rõ ràng", axis: "stability", pole: 1 },
  P: { text: "thích linh hoạt, tuỳ cơ ứng biến", axis: "stability", pole: -1 },
};

export type MbtiCompareStatus = "match" | "diff" | "none" | "unknown";

/** So từng chữ cái MBTI với mini-test. "none" = mini-test không đo; "unknown" = chưa làm mini-test. */
export function compareMbti(code: MbtiCode, scores: WorkStyleScores | null): { letter: string; text: string; status: MbtiCompareStatus; note: string }[] {
  return code.split("").map((letter) => {
    const l = MBTI_LETTER[letter];
    if (!l.axis || !l.pole) return { letter, text: l.text, status: "none" as const, note: "Mini-test không đo trục này" };
    const axis = l.axis;
    if (!scores) return { letter, text: l.text, status: "unknown" as const, note: `Tương ứng trục ${AXIS_INFO[axis].left.toLowerCase()} / ${AXIS_INFO[axis].right.toLowerCase()}` };
    const mine = poleOf(scores[axis]);
    const same = mine === l.pole;
    return { letter, text: l.text, status: same ? ("match" as const) : ("diff" as const), note: `Mini-test: ${sideLabel(axis, mine).toLowerCase()} → ${same ? "khớp" : "khác"}` };
  });
}

// ---------------------------------------------------------------------------------------------
// Làm sạch dữ liệu (dùng chung cho localStorage và API đồng bộ — không tin client).
// ---------------------------------------------------------------------------------------------
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const validDate = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));

export function sanitizeWorkStyle(input: unknown): StoredWorkStyle | null {
  if (!isObj(input) || !isObj(input.scores) || !validDate(input.completedAt)) return null;
  const s = input.scores;
  const scores = {} as WorkStyleScores;
  for (const a of WORK_AXES) {
    const v = s[a];
    if (typeof v !== "number" || !AXIS_VALUES.has(v)) return null;
    scores[a] = v;
  }
  return { scores, completedAt: new Date(Date.parse(input.completedAt)).toISOString() };
}

export function sanitizeMbti(input: unknown): StoredMbti | null {
  if (!isObj(input) || !isMbtiCode(input.code) || !validDate(input.updatedAt)) return null;
  return { code: input.code, updatedAt: new Date(Date.parse(input.updatedAt)).toISOString() };
}
