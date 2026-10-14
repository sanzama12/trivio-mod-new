/**
 * SERVICE LAYER — Trợ lý hỏi đáp ngành học (chatbot) có kiểm soát.
 *
 * Thiết kế để KHÔNG đưa thông tin sai về tuyển sinh:
 * 1. Trả lời bằng cách truy xuất dữ liệu có cấu trúc của Trovio (ngành, trường, chương trình, điểm chuẩn,
 *    việc làm có nguồn, cảm nhận đã duyệt, mốc tuyển sinh) — không "sáng tác" nội dung.
 * 2. Mọi con số kèm năm và nguồn; câu trả lời có liên kết tới trang gốc để người dùng kiểm tra.
 * 3. Từ chối dự đoán điểm chuẩn, cam kết đỗ, gian lận; câu hỏi ngoài phạm vi → nói rõ "chưa có thông tin".
 * 4. (Tuỳ chọn) lớp LLM chỉ được diễn đạt lại; mọi con số trong câu trả lời LLM phải có trong dữ kiện,
 *    nếu không sẽ dùng câu trả lời gốc (xem chatbot-llm.ts).
 */
import { randomUUID } from "node:crypto";
import type { ChatAlias, Major, Program, PublicUser, RiasecResult, School } from "../domain/types";
import { MAX_QUESTION, type ChatAnswer, type ChatItem, type ChatKind, type ChatSource } from "../domain/chat";
import { RIASEC_INFO } from "../domain/riasec";
import { repositories } from "../repositories";
import { normalizeVi } from "../lib/text";
import { ADMISSION_METHODS, cutoffFor, formatMethodScore } from "./scoring.service";
import { outcomeService } from "./outcome.service";
import { reviewService } from "./review.service";
import { matchMajor, riasecService, sanitizeRiasec } from "./riasec.service";
import { timelineService } from "./timeline.service";
import { polishWithLlm } from "./chatbot-llm";

export { MAX_QUESTION } from "../domain/chat";
export type { ChatAnswer, ChatItem, ChatKind, ChatSource } from "../domain/chat";

export interface ChatContextIn {
  majorId?: unknown;
  schoolId?: unknown;
  riasec?: unknown;
  /** Đường dẫn trang đang xem (VD: /nganh/marketing) — dùng làm ngữ cảnh khi hội thoại chưa có. */
  page?: unknown;
}

// ---------------------------------------------------------------------------
// Nhận diện thực thể & ý định
// ---------------------------------------------------------------------------

/** Chuẩn hoá: bỏ dấu, chữ thường, chỉ giữ chữ-số, có khoảng trắng 2 đầu để so khớp theo từ. */
export const norm = (s: string) => ` ${normalizeVi(s).replace(/[^a-z0-9]+/g, " ").trim()} `;
const has = (n: string, phrases: string[]) => phrases.some((p) => n.includes(` ${p} `));

const MAJOR_ALIASES: Record<string, string[]> = {
  "cong-nghe-thong-tin": ["cntt", "nganh it"],
  "khoa-hoc-may-tinh": ["khmt", "computer science", "cs"],
  "ky-thuat-phan-mem": ["ktpm", "phan mem", "software"],
  "tri-tue-nhan-tao": ["nganh ai"],
  marketing: ["marketing", "mkt", "tiep thi", "digital marketing"],
  "quan-tri-kinh-doanh": ["qtkd", "quan tri kinh doanh"],
  "kinh-doanh-quoc-te": ["kdqt", "kinh doanh quoc te"],
  "tai-chinh-ngan-hang": ["nganh tai chinh", "ngan hang", "tcnh", "tai chinh"],
  "quan-tri-dich-vu-du-lich-va-lu-hanh": ["du lich", "lu hanh", "quan tri du lich", "quan tri dich vu du lich va lu hanh"],
  "y-khoa": ["y khoa", "y da khoa", "bac si"],
  "duoc-hoc": ["duoc hoc", "duoc si", "nganh duoc", "duoc"],
  "ky-thuat-dien": ["nganh dien", "ky thuat dien"],
  "ky-thuat-co-khi": ["nganh co khi", "co khi"],
  "thiet-ke-do-hoa": ["do hoa", "thiet ke", "graphic design"],
  "tam-ly-hoc": ["tam ly", "tam ly hoc"],
  luat: ["luat", "nganh luat", "luat hoc"],
  "quan-he-cong-chung": ["pr", "quan he cong chung"],
  "su-pham-toan-hoc": ["su pham", "su pham toan", "su pham toan hoc"],
  "cong-nghe-thuc-pham": ["thuc pham", "cong nghe thuc pham"],
  "khoa-hoc-moi-truong": ["nganh moi truong", "moi truong"],
};

const SCHOOL_ALIASES: Record<string, string[]> = {
  hust: ["bach khoa ha noi", "dhbk ha noi", "dhbkhn", "hust", "bach khoa"],
  neu: ["kinh te quoc dan", "neu", "ktqd"],
  ftu: ["ngoai thuong", "ftu"],
  uet: ["cong nghe dhqghn", "uet"],
  hmu: ["y ha noi", "hmu"],
  hup: ["duoc ha noi", "hup"],
  ussh: ["nhan van", "ussh", "khoa hoc xa hoi va nhan van"],
  hnue: ["su pham ha noi", "hnue"],
  vnua: ["hoc vien nong nghiep", "nong nghiep viet nam", "vnua"],
  fpt: ["fpt"],
  dut: ["bach khoa da nang", "dut"],
  rmit: ["rmit"],
  ueh: ["kinh te tp hcm", "kinh te tphcm", "kinh te thanh pho ho chi minh", "ueh"],
  hcmus: ["khoa hoc tu nhien", "khtn", "hcmus"],
  tdtu: ["ton duc thang", "tdtu"],
  ctu: ["dai hoc can tho", "dh can tho", "ctu"],
};

interface Knowledge {
  majors: Major[];
  schools: School[];
  programs: Program[];
  majorIndex: [string, string][]; // [alias chuẩn hoá, majorId] sắp theo độ dài giảm dần
  schoolIndex: [string, string][];
}

function programsOfAll(k: Knowledge, mid?: string | null, sid?: string | null) {
  return k.programs.filter((p) => (!mid || p.majorId === mid) && (!sid || p.schoolId === sid));
}

async function knowledge(): Promise<Knowledge> {
  const [majors, schools, programs, custom] = await Promise.all([
    repositories.majors.findAll(),
    repositories.schools.findAll(),
    repositories.programs.findAll(),
    // Từ khoá bổ sung là tuỳ chọn: lỗi đọc không được làm hỏng cả trợ lý.
    repositories.chatAliases.list().catch(() => []),
  ]);
  const majorIndex: [string, string][] = [];
  for (const m of majors) {
    majorIndex.push([norm(m.name).trim(), m.id]);
    for (const a of MAJOR_ALIASES[m.id] ?? []) majorIndex.push([a, m.id]);
  }
  const schoolIndex: [string, string][] = [];
  for (const s of schools) {
    schoolIndex.push([norm(s.name).trim(), s.id], [norm(s.shortName).trim(), s.id]);
    for (const a of SCHOOL_ALIASES[s.id] ?? []) schoolIndex.push([a, s.id]);
  }
  // Từ khoá quản trị viên thêm ở /quan-tri/chatbot.
  for (const a of Array.isArray(custom) ? custom : []) (a.kind === "major" ? majorIndex : schoolIndex).push([a.alias, a.targetId]);
  const byLen = (a: [string, string], b: [string, string]) => b[0].length - a[0].length;
  return { majors, schools, programs, majorIndex: majorIndex.sort(byLen), schoolIndex: schoolIndex.sort(byLen) };
}

/**
 * Viết tắt trùng với từ tiếng Việt thông dụng khi bỏ dấu (VD: "nếu" → "neu"):
 * chỉ nhận khi người dùng gõ IN HOA trong câu gốc.
 */
const UPPERCASE_ONLY = new Set(["neu"]);

/** Tìm thực thể có tên/viết tắt DÀI NHẤT khớp theo từ (VD: ưu tiên "kinh doanh quoc te" hơn "kinh doanh"). */
function findEntity(n: string, index: [string, string][], raw = ""): string | null {
  for (const [alias, id] of index) {
    if (!alias || !n.includes(` ${alias} `)) continue;
    if (UPPERCASE_ONLY.has(alias) && !new RegExp(`\\b${alias.toUpperCase()}\\b`).test(raw)) continue;
    return id;
  }
  return null;
}

const I = {
  cheat: ["gian lan", "mua diem", "thi ho", "nang diem", "sua diem", "hack", "lo de", "chay diem", "chay truong"],
  predict: ["du doan", "du bao", "du kien", "nam sau", "nam toi", "sap toi", "tang hay giam", "se tang", "se giam", "se la", "se lay", "co tang", "co giam"],
  guarantee: ["co do khong", "do khong", "chac do", "chac chan do", "dam bao do", "kha nang do", "bao nhieu phan tram do", "co dau khong", "dau khong"],
  greet: ["xin chao", "chao", "hello", "hi", "alo", "chao ban"],
  thanks: ["cam on", "thanks", "thank you", "tks"],
  help: ["ban la ai", "ban lam duoc gi", "ban giup duoc gi", "huong dan", "hoi gi"],
  cutoff: ["diem chuan", "lay bao nhieu diem", "bao nhieu diem", "diem dau vao", "diem trung tuyen", "can bao nhieu diem"],
  tuition: ["hoc phi", "chi phi", "bao nhieu tien", "ton bao nhieu", "phi hoc"],
  salary: ["luong", "thu nhap", "kiem duoc", "ty le co viec", "ty le viec lam"],
  jobs: ["viec lam", "ra truong lam gi", "co hoi", "lam nghe gi", "lam cong viec gi", "vi tri", "nghe nghiep", "lam gi", "xin viec", "kiem viec", "that nghiep"],
  info: ["hoc gi", "hoc nhung gi", "la gi", "gioi thieu", "mon hoc", "chuong trinh hoc", "noi dung", "hoc nhung mon"],
  fit: ["hop voi ai", "phu hop voi ai", "tinh cach", "so thich", "riasec", "can nhung gi", "can ky nang"],
  evaluate: [
    "co tot khong", "tot khong", "co nen", "nen hoc khong", "co hop voi", "co phu hop", "trien vong", "tuong lai", "co hot", "hot khong",
    "co kho khong", "kho khong", "co de khong", "de khong", "hoc co kho", "the nao", "ra sao", "co on khong", "on khong", "danh gia",
    "co dang hoc", "dang hoc khong", "co nen chon",
  ],
  quota: ["chi tieu", "tuyen bao nhieu", "tuyen sinh bao nhieu", "bao nhieu sinh vien", "lay bao nhieu nguoi"],
  duration: ["may nam", "bao nhieu nam", "hoc bao lau", "bao lau", "thoi gian dao tao", "thoi gian hoc"],
  notCovered: ["ky tuc xa", "ktx", "cho o", "nha o", "xe buyt", "dong phuc", "can tin", "gui xe", "hoc quan su"],
  schoolsFor: ["truong nao", "o dau", "hoc o dau", "truong dao tao", "dao tao o", "nhung truong"],
  combos: ["to hop", "khoi", "xet mon", "thi mon", "xet khoi", "mon xet"],
  methods: ["phuong thuc", "hoc ba", "danh gia nang luc", "dgnl", "hsa", "xet tuyen thang"],
  rules: ["nguyen vong", "thu tu nguyen vong", "uu tien", "khu vuc uu tien", "diem uu tien", "kv1", "kv2", "kv3", "kv2 nt", "doi tuong uu tien"],
  recommend: ["nen hoc nganh gi", "nen chon nganh", "hop voi toi", "chon nganh", "khong biet hoc gi", "nen hoc gi", "chon truong nao", "tu van"],
  reviews: ["cam nhan", "review", "danh gia truong", "moi truong hoc", "sinh vien noi", "hoc co tot", "co tot khong"],
  timeline: ["lich tuyen sinh", "khi nao", "han chot", "han dang ky", "moc", "bao gio", "thoi gian dang ky", "lich thi"],
  scholarship: ["hoc bong"],
  compare: ["so sanh"],
};

// ---------------------------------------------------------------------------
// Soạn câu trả lời
// ---------------------------------------------------------------------------

const DEMO_NOTE = "Điểm chuẩn, học phí trên Trovio (bản demo) là dữ liệu minh hoạ — luôn đối chiếu đề án tuyển sinh chính thức của trường.";
const OFFICIAL_PORTAL: ChatSource = { label: "Cổng thông tin tuyển sinh của Bộ GD&ĐT", href: "https://thisinh.thitotnghiepthpt.edu.vn", external: true };

const vn = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

function base(intent: string, kind: ChatKind, text: string, extra: Partial<ChatAnswer> = {}): ChatAnswer {
  return { kind, intent, text, items: [], sources: [], suggestions: [], context: {}, ...extra };
}

/** Tất cả thực thể khác nhau được nhắc trong câu (dùng cho so sánh). */
function findAllEntities(n: string, index: [string, string][], raw = ""): string[] {
  const found: { id: string; at: number }[] = [];
  let rest = n;
  for (const [alias, id] of index) {
    const at = alias ? rest.indexOf(` ${alias} `) : -1;
    if (at < 0) continue;
    if (UPPERCASE_ONLY.has(alias) && !new RegExp(`\\b${alias.toUpperCase()}\\b`).test(raw)) continue;
    if (!found.some((f) => f.id === id)) found.push({ id, at });
    // Che phần đã khớp (giữ độ dài) để "kinh doanh" không khớp lại trong "kinh doanh quoc te".
    rest = rest.slice(0, at + 1) + "#".repeat(alias.length) + rest.slice(at + 1 + alias.length);
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id); // theo thứ tự người dùng nhắc
}

/** Hỏi khả năng đỗ (có dấu): "... đỗ Bách khoa không?", "27 điểm có đậu không". */
function asksAdmissionChance(raw: string): boolean {
  const t = raw.toLowerCase().normalize("NFC");
  return /(đỗ|đậu|trúng tuyển|vào được|đủ điểm|có cửa)/.test(t) && /(không|ko|k|hông|hok|chưa)\s*[?.!…]*\s*$/.test(t);
}

/** "ngành X tại Y" / "ngành X" / "Y" — dùng sau "của", "cho". */
function subjectOf(major: Major | null, school: School | null): string {
  if (major && school) return `ngành ${major.name} tại ${school.shortName}`;
  return major ? `ngành ${major.name}` : (school?.shortName ?? "");
}

function methodAsked(n: string) {
  if (has(n, ["hoc ba"])) return "hocba" as const;
  if (has(n, ["tsa", "danh gia tu duy", "dgtd", "tu duy bach khoa", "tu duy hust"])) return "tsa" as const;
  if (has(n, ["dgnl hcm", "danh gia nang luc hcm", "dgnl tphcm", "dhqg hcm", "v act"])) return "dgnl-hcm" as const;
  if (has(n, ["hsa", "dgnl ha noi", "dgnl hn", "dhqg ha noi", "dhqghn"])) return "dgnl-hn" as const;
  if (has(n, ["danh gia nang luc", "dgnl"])) return "dgnl-hcm" as const;
  return "thpt" as const;
}

export async function answerQuestion(question: string, ctxIn: ChatContextIn = {}): Promise<ChatAnswer> {
  const q = question.slice(0, MAX_QUESTION);
  const n = norm(q);
  const k = await knowledge();
  const words = n.trim().split(" ").filter(Boolean);

  // --- 1. An toàn: gian lận, dự đoán, cam kết đỗ ---
  if (has(n, I.cheat)) {
    return base("cheat", "refusal", "Mình không thể hỗ trợ nội dung liên quan đến gian lận thi cử hay tác động kết quả tuyển sinh. Nếu bạn cần phản ánh sai phạm, hãy liên hệ Sở GD&ĐT hoặc Bộ GD&ĐT.", {
      suggestions: ["Điểm ưu tiên khu vực tính thế nào?", "Thứ tự nguyện vọng quan trọng thế nào?"],
    });
  }

  // Thực thể nêu trong câu hỏi; nếu không có thì dùng ngữ cảnh của câu trước (câu hỏi nối tiếp).
  const explicitMajor = findEntity(n, k.majorIndex, q);
  const explicitSchool = findEntity(n, k.schoolIndex, q);
  let ctxMajor = typeof ctxIn.majorId === "string" && k.majors.some((m) => m.id === ctxIn.majorId) ? ctxIn.majorId : null;
  let ctxSchool = typeof ctxIn.schoolId === "string" && k.schools.some((s) => s.id === ctxIn.schoolId) ? ctxIn.schoolId : null;
  if (!ctxMajor && !ctxSchool) {
    // Chưa có ngữ cảnh hội thoại → dùng trang đang xem ("ngành này học gì?" trên trang ngành).
    const page = typeof ctxIn.page === "string" ? /^\/(nganh|truong)\/([a-z0-9-]{1,100})\/?$/.exec(ctxIn.page) : null;
    if (page?.[1] === "nganh") ctxMajor = k.majors.find((m) => m.slug === page[2])?.id ?? null;
    if (page?.[1] === "truong") ctxSchool = k.schools.find((s) => s.slug === page[2])?.id ?? null;
  }
  // Hỏi ngành mới → bỏ ngữ cảnh trường cũ (và ngược lại) để không trộn nhầm.
  const majorId = explicitMajor ?? (explicitSchool ? null : ctxMajor);
  const schoolId = explicitSchool ?? (explicitMajor ? null : ctxSchool);
  const major = k.majors.find((m) => m.id === majorId) ?? null;
  const school = k.schools.find((s) => s.id === schoolId) ?? null;
  const ctx = { majorId: major?.id, schoolId: school?.id };

  const aboutScore = has(n, I.cutoff);
  const nowYear = new Date().getFullYear();
  const latestYear = Math.max(0, ...k.programs.flatMap((p) => [...p.cutoffs.map((c) => c.year), ...p.altCutoffs.map((c) => c.year)]));
  const mentionedYears = [...q.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  const askedYear = mentionedYears[0] ?? (has(n, ["nam nay"]) ? nowYear : null);
  const futureYear = mentionedYears.some((y) => y > nowYear);
  if ((aboutScore && (has(n, I.predict) || futureYear)) || has(n, I.guarantee) || asksAdmissionChance(q)) {
    const a = base(
      "predict",
      "refusal",
      "Mình không dự đoán điểm chuẩn hay khả năng đỗ, vì điểm chuẩn mỗi năm phụ thuộc chỉ tiêu và phổ điểm thực tế. Mình có thể cho bạn xem điểm chuẩn các năm đã công bố và mức An toàn / Vừa sức / Thử sức dựa trên điểm bạn nhập.",
      {
        context: ctx,
        suggestions: [major ? `Điểm chuẩn ngành ${major.name}` : "Điểm chuẩn ngành Công nghệ thông tin", "Thứ tự nguyện vọng quan trọng thế nào?"],
        sources: [
          { label: "Nhập điểm để xem mức phù hợp", href: "/diem-cua-toi" },
          { label: "Cách Trovio đánh giá mức phù hợp", href: "/cach-goi-y" },
        ],
      },
    );
    return a;
  }

  // --- 2. Xã giao ---
  if (has(n, I.thanks) && words.length <= 6) {
    return base("thanks", "answer", "Rất vui được hỗ trợ bạn! Bạn có thể hỏi tiếp về ngành học, điểm chuẩn, học phí hoặc việc làm.", { context: ctx, suggestions: defaultSuggestions() });
  }
  if ((has(n, I.greet) && words.length <= 5) || has(n, I.help)) {
    return base(
      "help",
      "answer",
      "Chào bạn! Mình là trợ lý ngành học của Trovio. Mình trả lời dựa trên dữ liệu của Trovio và luôn kèm nguồn để bạn kiểm tra: ngành học gì, trường nào đào tạo, điểm chuẩn các năm, học phí, việc làm & thu nhập, cảm nhận sinh viên, mốc tuyển sinh. Mình không dự đoán điểm chuẩn.",
      { context: ctx, suggestions: defaultSuggestions() },
    );
  }

  // --- 3. Câu hỏi quy chế chung (không cần thực thể) ---
  if (has(n, I.rules) && !has(n, I.cutoff) && !has(n, I.timeline)) {
    if (has(n, ["uu tien", "kv1", "kv2", "kv3", "kv2 nt", "doi tuong uu tien", "khu vuc uu tien", "diem uu tien"])) {
      return base(
        "rules-priority",
        "answer",
        "Điểm ưu tiên khu vực: KV1 +0,75; KV2-NT +0,5; KV2 +0,25; KV3 +0. Đối tượng ưu tiên: nhóm UT1 +2, nhóm UT2 +1. Theo quy chế áp dụng từ năm 2023, thí sinh có tổng điểm từ 22,5 trở lên (thang 30) được cộng ưu tiên giảm dần theo công thức [(30 − tổng điểm) / 7,5] × mức ưu tiên.",
        {
          context: ctx,
          note: "Quy chế có thể điều chỉnh theo từng năm — kiểm tra quy chế tuyển sinh năm bạn dự thi.",
          sources: [{ label: "Nhập điểm để tính điểm xét tuyển", href: "/diem-cua-toi" }, { label: "Cách Trovio tính điểm", href: "/cach-goi-y" }, OFFICIAL_PORTAL],
          suggestions: ["Thứ tự nguyện vọng quan trọng thế nào?", "Điểm chuẩn ngành Marketing"],
        },
      );
    }
    return base(
      "rules-wishlist",
      "answer",
      "Thí sinh đăng ký nguyện vọng theo thứ tự ưu tiên trên hệ thống của Bộ GD&ĐT (số lượng tối đa theo quy chế từng năm). Mỗi thí sinh chỉ trúng tuyển MỘT nguyện vọng — nguyện vọng có thứ tự cao nhất mà bạn đủ điều kiện. Vì vậy nên xếp nguyện vọng khó (Thử sức) lên trước, An toàn xuống cuối, và luôn có ít nhất một nguyện vọng An toàn.",
      {
        context: ctx,
        sources: [{ label: "Kiểm tra danh sách nguyện vọng của bạn", href: "/da-luu" }, { label: "Mốc đăng ký nguyện vọng", href: "/moc-tuyen-sinh" }, OFFICIAL_PORTAL],
        suggestions: ["Khi nào đăng ký nguyện vọng?", "Điểm ưu tiên khu vực tính thế nào?"],
      },
    );
  }

  if (has(n, I.timeline) && !major && !school) {
    const { events, note } = await timelineService.list();
    const today = new Date().toISOString().slice(0, 10);
    const TOPICS: [string[], string][] = [
      [["nguyen vong", "xet tuyen"], "nguyen vong"],
      [["le phi"], "le phi"],
      [["dang ky thi", "dang ky du thi"], "dang ky du thi"],
      [["thi tot nghiep", "thi thpt", "ky thi"], "ky thi tot nghiep"],
      [["diem thi"], "cong bo diem thi"],
      [["dgnl", "danh gia nang luc", "hsa", "v act"], "danh gia nang luc"],
      [["trung tuyen", "ket qua xet tuyen"], "trung tuyen"],
      [["nhap hoc"], "nhap hoc"],
    ];
    const topic = TOPICS.find(([keys]) => has(n, keys));
    const matched = topic ? events.filter((e) => norm(e.title).includes(` ${topic[1]} `) || norm(e.title).includes(topic[1])) : [];
    const shown = matched.length ? matched : events.filter((e) => (e.end ?? e.start) >= today).slice(0, 4);
    return base("timeline", "answer", matched.length ? "Mốc tuyển sinh liên quan:" : "Các mốc tuyển sinh sắp tới:", {
      context: ctx,
      items: shown.map((e) => ({
        title: e.title,
        meta: `${e.end && e.end !== e.start ? `${fmtDate(e.start)} – ${fmtDate(e.end)}` : fmtDate(e.start)}${(e.end ?? e.start) < today ? " · đã qua" : ""}`,
        href: "/moc-tuyen-sinh",
      })),
      note,
      sources: [{ label: "Lịch đầy đủ & nhắc hạn", href: "/moc-tuyen-sinh" }, OFFICIAL_PORTAL],
      suggestions: ["Thứ tự nguyện vọng quan trọng thế nào?"],
    });
  }

  if (has(n, I.recommend) && !explicitMajor) {
    const riasec = sanitizeRiasec(ctxIn.riasec);
    if (riasec) {
      const recs = await riasecService.recommendMajors(riasec as Pick<RiasecResult, "percents" | "code">, 3);
      return base("recommend", "answer", `Dựa trên kết quả trắc nghiệm RIASEC của bạn (mã ${riasec.code.join("-")}), các ngành phù hợp nhất là:`, {
        context: ctx,
        items: recs.map((r) => ({ title: r.major.name, meta: `${r.match}% phù hợp · ${r.group.name}`, href: `/nganh/${r.major.slug}` })),
        note: "Mức phù hợp dựa trên sở thích, chưa xét điểm và tài chính — xem thêm “Dành cho bạn” ở trang chủ.",
        sources: [{ label: "Kết quả trắc nghiệm của bạn", href: "/trac-nghiem/ket-qua" }, { label: "Cách tính mức phù hợp", href: "/cach-goi-y#danh-cho-ban" }],
        suggestions: recs.slice(0, 2).map((r) => `Ngành ${r.major.name} học gì?`),
      });
    }
    return base(
      "recommend",
      "answer",
      "Chọn ngành nên dựa trên sở thích, năng lực và điều kiện tài chính. Bạn có thể làm trắc nghiệm sở thích RIASEC (7–10 phút) rồi nhập điểm — Trovio sẽ gợi ý ngành và chương trình phù hợp kèm lý do.",
      {
        context: ctx,
        sources: [{ label: "Làm trắc nghiệm RIASEC", href: "/trac-nghiem" }, { label: "Nhập điểm", href: "/diem-cua-toi" }],
        suggestions: ["Ngành Công nghệ thông tin học gì?", "Lương ngành Marketing"],
      },
    );
  }

  if (has(n, I.methods) && !major && !school && !has(n, I.cutoff) && has(n, I.schoolsFor) && !has(n, ["xet tuyen thang"])) {
    // "Trường nào xét ĐGNL HCM / học bạ?" → liệt kê trường có điểm chuẩn theo phương thức đó (chỉ dữ liệu đã có).
    const method = methodAsked(n);
    const cfg = ADMISSION_METHODS[method];
    const bySchool = new Map<string, number>();
    for (const p of k.programs) if (cutoffFor(p, method)) bySchool.set(p.schoolId, (bySchool.get(p.schoolId) ?? 0) + 1);
    const list = k.schools.filter((s) => bySchool.has(s.id));
    if (list.length === 0) {
      return base("methods-schools", "unknown", `Trovio chưa có dữ liệu trường xét tuyển bằng ${cfg.label}.`, {
        sources: [{ label: "Bảng quy đổi theo phương thức", href: "/cach-goi-y#phuong-thuc" }, OFFICIAL_PORTAL],
      });
    }
    return base("methods-schools", "answer", `Các trường trên Trovio có điểm chuẩn theo ${cfg.label} (theo dữ liệu đã công bố):`, {
      items: list.slice(0, 8).map((s) => ({ title: s.name, meta: `${bySchool.get(s.id)} chương trình`, href: `/chuong-trinh?q=${encodeURIComponent(s.shortName)}&method=${method}` })),
      note: `${DEMO_NOTE} Điểm chuẩn ${cfg.short} trong bản demo là số ước tính. Danh sách chỉ gồm các trường Trovio đang có dữ liệu, không phải toàn bộ trường xét phương thức này.`,
      sources: [{ label: `Xem chương trình xét ${cfg.short}`, href: `/chuong-trinh?method=${method}` }, { label: "Bảng quy đổi theo phương thức", href: "/cach-goi-y#phuong-thuc" }],
      suggestions: [`Điểm chuẩn ${cfg.short} ngành Marketing`, "Thứ tự nguyện vọng quan trọng thế nào?"],
    });
  }

  if (has(n, I.methods) && !major && !school && !has(n, I.cutoff)) {
    return base(
      "methods",
      "answer",
      "Trovio hỗ trợ so sánh theo 5 phương thức: điểm thi tốt nghiệp THPT (thang 30), học bạ (thang 30), đánh giá năng lực ĐHQG Hà Nội – HSA (thang 150), ĐHQG TP.HCM (thang 1200) và đánh giá tư duy ĐH Bách Khoa Hà Nội – TSA (thang 100). Mỗi trường chọn phương thức riêng; ngưỡng An toàn / Vừa sức được quy đổi theo thang điểm và đề án chính thức.",
      {
        context: ctx,
        sources: [{ label: "Bảng quy đổi theo phương thức", href: "/cach-goi-y#phuong-thuc" }, { label: "Nhập điểm theo phương thức", href: "/diem-cua-toi" }],
        suggestions: ["Điểm chuẩn học bạ ngành Marketing", "Trường nào xét ĐGNL HCM?"],
      },
    );
  }

  // Tổ hợp theo mã (A00, D01…): gồm môn gì / ngành nào xét.
  const comboCode = /\b([abcdhkmntvx]\d{2})\b/i.exec(q)?.[1]?.toUpperCase();
  if (comboCode && !major && !school) {
    const [combos, subjects] = await Promise.all([repositories.catalog.findCombos(), repositories.catalog.findSubjects()]);
    const combo = combos.find((c) => c.code === comboCode);
    const withCombo = k.programs.filter((p) => p.combos.includes(comboCode));
    if (!combo && withCombo.length === 0) {
      return base("combos", "unknown", `Trovio chưa có thông tin về tổ hợp ${comboCode}.`, { sources: [{ label: "Nhập điểm theo tổ hợp", href: "/diem-cua-toi" }, OFFICIAL_PORTAL] });
    }
    const subjectNames = combo ? combo.subjects.map((id) => subjects.find((x) => x.id === id)?.name ?? id).join(", ") : null;
    const majorsWith = Array.from(new Set(withCombo.map((p) => p.majorId)))
      .map((id) => k.majors.find((m) => m.id === id))
      .filter((m): m is Major => !!m);
    const wantMajors = has(n, ["nganh nao", "nganh gi", "truong nao", "xet nhung", "hoc gi", "hoc nganh"]);
    return base("combos", "answer", `${subjectNames ? `Tổ hợp ${comboCode} gồm: ${subjectNames}.` : `Tổ hợp ${comboCode}.`} Trên Trovio có ${withCombo.length} chương trình xét tổ hợp này${wantMajors || !subjectNames ? ", thuộc các ngành:" : "."}`, {
      items: wantMajors || !subjectNames ? majorsWith.slice(0, 8).map((m) => ({ title: m.name, meta: `${withCombo.filter((p) => p.majorId === m.id).length} chương trình`, href: `/chuong-trinh?combos=${comboCode}&majors=${m.id}` })) : [],
      note: "Tổ hợp và môn xét tuyển do từng trường quy định trong đề án tuyển sinh hằng năm.",
      sources: [{ label: `Chương trình xét ${comboCode}`, href: `/chuong-trinh?combos=${comboCode}` }, { label: "Nhập điểm theo tổ hợp", href: "/diem-cua-toi" }],
      suggestions: [`Khối ${comboCode} học ngành nào?`, "Điểm ưu tiên khu vực tính thế nào?"],
    });
  }

  // "Mình 25 điểm thì vào trường/ngành nào?" → không đoán, chỉ tới công cụ so khớp có giải thích.
  if (/\b\d{1,4}([.,]\d+)?\s*(d|diem)\b/.test(n) && has(n, ["truong nao", "nganh nao", "hoc o dau", "hoc gi", "chon truong", "chon nganh"])) {
    return base("score-advice", "answer", "Bạn nhập điểm (kèm tổ hợp hoặc phương thức) ở mục “Điểm của tôi” — Trovio sẽ đối chiếu với điểm chuẩn các năm đã công bố và xếp các chương trình theo mức An toàn / Vừa sức / Thử sức, kèm giải thích. Kết quả chỉ để tham khảo, không phải dự đoán.", {
      context: ctx,
      sources: [{ label: "Nhập điểm của tôi", href: "/diem-cua-toi" }, { label: "Cách Trovio xếp mức phù hợp", href: "/cach-goi-y" }],
      suggestions: ["Thứ tự nguyện vọng quan trọng thế nào?", "Điểm ưu tiên khu vực tính thế nào?"],
    });
  }

  // So sánh 2–3 trường hoặc ngành được nêu tên.
  if (has(n, I.compare)) {
    const sIds = findAllEntities(n, k.schoolIndex, q).slice(0, 3);
    const mIds = findAllEntities(n, k.majorIndex, q).slice(0, 3);
    const range = (xs: number[], f = (x: number) => vn(x)) => (xs.length ? (Math.min(...xs) === Math.max(...xs) ? f(xs[0]) : `${f(Math.min(...xs))}–${f(Math.max(...xs))}`) : "—");
    if (sIds.length >= 2 || mIds.length >= 2) {
      const bySchool = sIds.length >= 2;
      const items: ChatItem[] = bySchool
        ? sIds.map((id) => {
            const s = k.schools.find((x) => x.id === id)!;
            const ps = programsOfAll(k, null, id);
            const cut = ps.flatMap((p) => (p.cutoffs[0] ? [p.cutoffs[0].score] : []));
            return { title: s.name, meta: `${ps.length} chương trình · điểm chuẩn THPT ${range(cut, (x) => formatMethodScore(x))} · học phí ${range(ps.flatMap((p) => [p.tuitionMin, p.tuitionMax]))} triệu/năm`, href: `/truong/${s.slug}` };
          })
        : mIds.map((id) => {
            const m = k.majors.find((x) => x.id === id)!;
            const ps = programsOfAll(k, id, null);
            const cut = ps.flatMap((p) => (p.cutoffs[0] ? [p.cutoffs[0].score] : []));
            return { title: `Ngành ${m.name}`, meta: `${ps.length} chương trình · điểm chuẩn THPT ${range(cut, (x) => formatMethodScore(x))} · học phí ${range(ps.flatMap((p) => [p.tuitionMin, p.tuitionMax]))} triệu/năm`, href: `/nganh/${m.slug}` };
          });
      return base("compare", "answer", "So sánh nhanh theo dữ liệu trên Trovio (điểm chuẩn năm gần nhất đã công bố):", {
        context: ctx,
        items,
        note: `${DEMO_NOTE} Chọn chương trình cụ thể để so sánh chi tiết (tối đa 3).`,
        sources: [{ label: "Mở trang So sánh", href: "/so-sanh" }],
        suggestions: bySchool ? sIds.map((id) => `Cảm nhận sinh viên ${k.schools.find((x) => x.id === id)!.shortName}`).slice(0, 2) : mIds.map((id) => `Lương ngành ${k.majors.find((x) => x.id === id)!.name}`).slice(0, 2),
      });
    }
  }

  // Chủ đề Trovio không có dữ liệu (ký túc xá, xe buýt…) → nói rõ, chỉ nguồn chính thức.
  if (has(n, I.notCovered)) {
    return base("not-covered", "unknown", `Trovio chưa có thông tin về chủ đề này${school ? ` của ${school.shortName}` : ""}. Bạn nên xem website chính thức hoặc liên hệ phòng tuyển sinh/công tác sinh viên của trường.`, {
      context: ctx,
      sources: school ? [{ label: `Website ${school.shortName}`, href: school.website, external: true }, { label: `Trang trường ${school.shortName}`, href: `/truong/${school.slug}` }] : [{ label: "Trợ giúp", href: "/tro-giup" }],
    });
  }

  // --- 4. Câu hỏi theo thực thể ---
  const programsOf = (mid?: string | null, sid?: string | null) => programsOfAll(k, mid, sid);
  const schoolName = (id: string) => k.schools.find((s) => s.id === id)?.shortName ?? id;

  if (has(n, I.cutoff) || (has(n, I.methods) && (major || school))) {
    const subject = subjectOf(major, school);
    if (askedYear && askedYear > latestYear) {
      // Năm chưa có trong dữ liệu (đã hoặc chưa công bố) → không đoán, chỉ nguồn chính thức.
      return base("cutoff", "unknown", `Trovio chưa cập nhật điểm chuẩn năm ${askedYear}${subject ? ` của ${subject}` : ""} (dữ liệu gần nhất: năm ${latestYear}). Điểm chuẩn chính thức được công bố trên website của trường và cổng thông tin tuyển sinh của Bộ GD&ĐT.`, {
        context: ctx,
        sources: [...(school ? [{ label: `Website ${school.shortName}`, href: school.website, external: true }] : []), OFFICIAL_PORTAL],
        suggestions: subject ? [`Điểm chuẩn ${subject} năm ${latestYear}`] : [`Điểm chuẩn ngành Công nghệ thông tin năm ${latestYear}`],
      });
    }
    if (!major && !school) {
      return base("cutoff", "clarify", "Bạn muốn xem điểm chuẩn của ngành hoặc trường nào?", {
        suggestions: ["Điểm chuẩn ngành Công nghệ thông tin", "Điểm chuẩn Đại học Kinh tế Quốc dân", "Điểm chuẩn học bạ ngành Marketing"],
      });
    }
    const method = methodAsked(n);
    const cfg = ADMISSION_METHODS[method];
    const pick = (p: Program): { year: number; score: number; estimated?: boolean } | null => {
      if (!askedYear) return cutoffFor(p, method);
      if (method === "thpt") return p.cutoffs.find((c) => c.year === askedYear) ?? null;
      const c = cutoffFor(p, method);
      return c && c.year === askedYear ? c : null;
    };
    const list = programsOf(major?.id, school?.id)
      .map((p) => ({ p, c: pick(p) }))
      .filter((x) => x.c)
      .sort((a, b) => b.c!.score - a.c!.score);
    if (list.length === 0) {
      return base("cutoff", "unknown", `Trovio chưa có điểm chuẩn (${cfg.short})${askedYear ? ` năm ${askedYear}` : ""} cho ${subject}.`, {
        context: ctx,
        sources: [{ label: "Tìm chương trình", href: "/chuong-trinh" }],
        suggestions: method !== "thpt" ? [`Điểm chuẩn ${subject}`] : ["Trường nào đào tạo ngành Marketing?"],
      });
    }
    const years = Array.from(new Set(list.map((x) => x.c!.year)));
    return base("cutoff", "answer", `Điểm chuẩn ${years.length === 1 ? `năm ${years[0]}` : "gần nhất"} (${cfg.short}) của ${subject} (đã công bố, xếp từ cao đến thấp):`, {
      context: ctx,
      items: list.slice(0, 6).map(({ p, c }) => ({
        title: `${p.name} – ${schoolName(p.schoolId)}`,
        meta: `${formatMethodScore(c!.score, method)} điểm${cfg.max !== 30 ? `/${cfg.max}` : ""} · năm ${c!.year}${c!.estimated ? " · ƯỚC TÍNH" : ""}`,
        href: `/chuong-trinh/${p.slug}`, programId: p.id,
      })),
      note: `${list.some((x) => x.c!.estimated) ? "Điểm chuẩn học bạ/ĐGNL trên Trovio hiện là số ƯỚC TÍNH suy ra từ điểm thi THPT, chưa phải điểm trường công bố. " : ""}${DEMO_NOTE} Trovio không dự đoán điểm chuẩn năm tới.`,
      sources: [
        { label: "Nhập điểm để xem An toàn / Vừa sức / Thử sức", href: "/diem-cua-toi" },
        ...(list.length > 6 ? [{ label: `Xem tất cả ${list.length} chương trình`, href: `/chuong-trinh?${major ? `majors=${major.id}` : `q=${encodeURIComponent(school!.shortName)}`}${method !== "thpt" ? `&method=${method}` : ""}` }] : []),
      ],
      suggestions: [major ? `Học phí ngành ${major.name}` : `Học phí ${school!.shortName}`, major ? `Lương ngành ${major.name}` : `Cảm nhận sinh viên ${school!.shortName}`],
    });
  }

  if ((has(n, I.quota) || has(n, I.duration)) && (major || school)) {
    const quota = has(n, I.quota);
    const list = programsOf(major?.id, school?.id);
    if (list.length === 0) return base(quota ? "quota" : "duration", "unknown", `Trovio chưa có chương trình nào cho ${subjectOf(major, school)}.`, { context: ctx });
    return base(quota ? "quota" : "duration", "answer", quota ? `Chỉ tiêu tuyển sinh của ${subjectOf(major, school)} trên Trovio:` : `Thời gian đào tạo của ${subjectOf(major, school)}:`, {
      context: ctx,
      items: list.slice(0, 6).map((p) => ({
        title: `${p.name} – ${schoolName(p.schoolId)}`,
        meta: quota ? `${p.quota.toLocaleString("vi-VN")} chỉ tiêu · cập nhật ${p.updatedAt.split("-").reverse().join("/")}` : `${vn(p.durationYears)} năm · ${p.trainingType}`,
        href: `/chuong-trinh/${p.slug}`, programId: p.id,
      })),
      note: quota ? `${DEMO_NOTE} Chỉ tiêu có thể chia theo phương thức xét tuyển.` : "Thời gian đào tạo theo chương trình chuẩn; có thể rút ngắn hoặc kéo dài theo tiến độ tích luỹ tín chỉ.",
      suggestions: [major ? `Điểm chuẩn ngành ${major.name}` : `Điểm chuẩn ${school!.shortName}`],
    });
  }

  if (has(n, I.tuition)) {
    if (!major && !school) return base("tuition", "clarify", "Bạn muốn xem học phí của ngành hoặc trường nào?", { suggestions: ["Học phí ngành Y khoa", "Học phí Đại học FPT"] });
    const list = programsOf(major?.id, school?.id).sort((a, b) => a.tuitionMin - b.tuitionMin);
    if (list.length === 0) return base("tuition", "unknown", "Trovio chưa có dữ liệu học phí cho lựa chọn này.", { context: ctx });
    return base("tuition", "answer", `Học phí dự kiến (triệu đồng/năm) của ${subjectOf(major, school)}:`, {
      context: ctx,
      items: list.slice(0, 6).map((p) => ({
        title: `${p.name} – ${schoolName(p.schoolId)}`,
        meta: p.tuitionMax === 0 ? "Miễn học phí (theo dữ liệu)" : p.tuitionMin === p.tuitionMax ? `${vn(p.tuitionMin)} triệu/năm` : `${vn(p.tuitionMin)}–${vn(p.tuitionMax)} triệu/năm`,
        href: `/chuong-trinh/${p.slug}`, programId: p.id,
      })),
      note: `${DEMO_NOTE} Học phí có thể tăng theo lộ trình của trường.`,
      suggestions: [major ? `Trường nào đào tạo ngành ${major.name}?` : `Học bổng ${school!.shortName}`],
    });
  }

  if ((has(n, I.salary) || has(n, I.jobs)) && (major || school)) {
    if (major) {
      const [outcome, benchmarks] = await Promise.all([outcomeService.getMajor(major.id), outcomeService.benchmarks()]);
      const items: ChatItem[] = [];
      const sources: ChatSource[] = [{ label: `Việc làm & thu nhập ngành ${major.name}`, href: `/nganh/${major.slug}#viec-lam` }];
      const trustNote = (t: string) => (t === "minh-hoa" ? " · MINH HOẠ" : "");
      if (outcome?.employmentRate) {
        const m = outcome.employmentRate;
        items.push({ title: "Tỷ lệ có việc làm trong 12 tháng", meta: `${vn(m.metric.value)}% · ${m.metric.year} · nguồn: ${m.source.publisher}${trustNote(m.source.trust)}` });
      }
      if (outcome?.startingSalary) {
        const m = outcome.startingSalary;
        const range = m.metric.low !== undefined && m.metric.high !== undefined ? ` (phổ biến ${vn(m.metric.low)}–${vn(m.metric.high)})` : "";
        items.push({ title: "Lương khởi điểm (trung vị)", meta: `${vn(m.metric.value)} triệu/tháng${range} · ${m.metric.year} · nguồn: ${m.source.publisher}${trustNote(m.source.trust)}` });
      }
      if (outcome?.experiencedSalary) {
        const m = outcome.experiencedSalary;
        items.push({ title: "Thu nhập sau 3–5 năm", meta: `${vn(m.metric.value)} triệu/tháng · ${m.metric.year} · nguồn: ${m.source.publisher}${trustNote(m.source.trust)}` });
      }
      const income = benchmarks.find((b) => b.id === "income-2025");
      if (income) {
        items.push({ title: "Mốc so sánh: thu nhập bình quân lao động cả nước", meta: `${vn(income.value)} ${income.unit} · ${income.year} · nguồn: ${income.source.publisher}` });
        if (income.source.url) sources.push({ label: `${income.source.publisher} – ${income.source.title}`, href: income.source.url, external: true });
      }
      const real = [outcome?.employmentRate, outcome?.startingSalary, outcome?.experiencedSalary].some((m) => m && m.source.trust !== "minh-hoa");
      const careers = major.careers.map((c) => c.title).join(", ");
      return base("salary", items.length ? "answer" : "unknown", `Ngành ${major.name} — các vị trí phổ biến: ${careers}.${items.length ? " Số liệu việc làm & thu nhập:" : " Trovio chưa có số liệu thu nhập có nguồn cho ngành này."}`, {
        context: ctx,
        items,
        note: real
          ? "Số liệu thu nhập dao động theo địa phương và năng lực; xem nguồn để biết phạm vi khảo sát."
          : "Số liệu theo ngành hiện là MINH HOẠ (chưa phải thống kê thật). Chỉ số thu nhập bình quân cả nước là số liệu chính thức.",
        sources: [...sources, { label: "Nguồn dữ liệu & cách đọc số liệu", href: "/viec-lam#nguon-du-lieu" }],
        suggestions: [`Trường nào đào tạo ngành ${major.name}?`, `Ngành ${major.name} học gì?`],
      });
    }
    const so = await outcomeService.getSchool(school!.id);
    if (!so?.employmentRate) {
      return base("salary", "unknown", `Trovio chưa thu thập được báo cáo khảo sát việc làm của ${school!.shortName}. Theo Thông tư 09/2024/TT-BGDĐT, trường phải công khai tỷ lệ người học tốt nghiệp có việc làm trong 12 tháng trên website.`, {
        context: ctx,
        sources: [{ label: `Website ${school!.shortName}`, href: school!.website, external: true }, { label: "Việc làm theo ngành", href: "/viec-lam" }],
      });
    }
    return base("salary", "answer", `Kết quả khảo sát việc làm của ${school!.shortName}${so.cohort ? ` (${so.cohort.toLowerCase()})` : ""}:`, {
      context: ctx,
      items: [
        { title: "Tỷ lệ có việc làm", meta: `${vn(so.employmentRate.metric.value)}% · nguồn: ${so.employmentRate.source.publisher}` },
        ...(so.salaryNote ? [{ title: "Thu nhập", meta: `${so.salaryNote.text} · nguồn: ${so.salaryNote.source.publisher}` }] : []),
      ],
      note: so.employmentRate.metric.note,
      sources: [
        ...(so.employmentRate.source.url ? [{ label: so.employmentRate.source.title, href: so.employmentRate.source.url, external: true }] : []),
        { label: `Trang trường ${school!.shortName}`, href: `/truong/${school!.slug}` },
      ],
    });
  }

  if ((has(n, I.salary) || has(n, I.jobs)) && !major && !school) {
    const income = (await outcomeService.benchmarks()).find((b) => b.id === "income-2025");
    return base("salary", "clarify", "Bạn muốn xem việc làm & thu nhập của ngành nào? Bảng theo ngành có ở trang Việc làm & thu nhập — mỗi số liệu kèm nguồn và mức tin cậy. Số liệu theo ngành trong bản demo là minh hoạ nên Trovio không xếp hạng “ngành lương cao nhất”.", {
      items: income ? [{ title: "Mốc chính thức: thu nhập bình quân lao động cả nước", meta: `${vn(income.value)} ${income.unit} · ${income.year} · nguồn: ${income.source.publisher}` }] : [],
      sources: [{ label: "Việc làm & thu nhập theo ngành", href: "/viec-lam" }, ...(income?.source.url ? [{ label: income.source.publisher, href: income.source.url, external: true }] : [])],
      suggestions: ["Lương ngành Công nghệ thông tin", "Lương ngành Kế toán"],
    });
  }

  if (has(n, I.reviews) && school) {
    const { summary } = await reviewService.listPublic(school.id);
    if (summary.count === 0) {
      return base("reviews", "unknown", `Chưa có cảm nhận sinh viên nào về ${school.shortName} được kiểm duyệt.`, {
        context: ctx,
        sources: [{ label: `Viết cảm nhận về ${school.shortName}`, href: `/truong/${school.slug}` }],
      });
    }
    return base(
      "reviews",
      "answer",
      `${school.shortName} có ${summary.count} cảm nhận đã kiểm duyệt, điểm trung bình ${vn(summary.overall ?? 0)}/5 (giảng dạy ${vn(summary.byCriterion.teaching ?? 0)}, cơ sở vật chất ${vn(summary.byCriterion.facilities ?? 0)}, hoạt động ${vn(summary.byCriterion.activities ?? 0)}, hỗ trợ việc làm ${vn(summary.byCriterion.career ?? 0)}).`,
      {
        context: ctx,
        note: "Cảm nhận là trải nghiệm cá nhân của người viết, không phải đánh giá chính thức.",
        sources: [{ label: `Đọc cảm nhận tại trang ${school.shortName}`, href: `/truong/${school.slug}` }],
      },
    );
  }

  if (has(n, I.scholarship) && school) {
    return base("scholarship", "answer", `Học bổng tại ${school.shortName}: ${school.scholarships}`, {
      context: ctx,
      note: "Điều kiện học bổng thay đổi theo năm — kiểm tra thông báo trên website trường.",
      sources: [{ label: `Website ${school.shortName}`, href: school.website, external: true }, { label: `Trang trường ${school.shortName}`, href: `/truong/${school.slug}` }],
    });
  }

  if (has(n, I.combos) && (major || school)) {
    const list = programsOf(major?.id, school?.id);
    const combos = Array.from(new Set(list.flatMap((p) => p.combos))).sort();
    return base(
      "combos",
      combos.length ? "answer" : "unknown",
      combos.length
        ? `Tổ hợp xét tuyển của ${subjectOf(major, school)} trên Trovio: ${combos.join(", ")}.`
        : "Các chương trình này không xét tổ hợp điểm thi THPT hoặc chưa có dữ liệu tổ hợp chính thức.",
      {
        context: ctx,
        items: list.slice(0, 6).map((p) => ({ title: `${p.name} – ${schoolName(p.schoolId)}`, meta: p.combos.join(", ") || "Chưa có dữ liệu tổ hợp", href: `/chuong-trinh/${p.slug}`, programId: p.id })),
        note: DEMO_NOTE,
      },
    );
  }

  if (has(n, I.schoolsFor) && major) {
    const list = programsOf(major.id, null);
    return base("schools", list.length ? "answer" : "unknown", list.length ? `Có ${list.length} chương trình ngành ${major.name} trên Trovio:` : `Trovio chưa có trường đào tạo ngành ${major.name}.`, {
      context: ctx,
      items: list.slice(0, 8).map((p) => ({ title: `${schoolName(p.schoolId)} – ${p.name}`, meta: p.trainingType, href: `/chuong-trinh/${p.slug}`, programId: p.id })),
      sources: [{ label: `Tất cả trường đào tạo ${major.name}`, href: `/nganh/${major.slug}` }],
      suggestions: [`Điểm chuẩn ngành ${major.name}`, `Học phí ngành ${major.name}`],
    });
  }

  // "Ngành X có tốt không / có nên học / có khó không / triển vọng?" → không phán xét chung, đưa dữ kiện có nguồn để tự cân nhắc.
  if (has(n, I.evaluate) && major && !school) {
    const [outcome, riasec] = [await outcomeService.getMajor(major.id), sanitizeRiasec(ctxIn.riasec)];
    const ps = programsOf(major.id, null);
    const cut = ps.flatMap((p) => (p.cutoffs[0] ? [p.cutoffs[0].score] : []));
    const fees = ps.flatMap((p) => [p.tuitionMin, p.tuitionMax]).filter((x) => x > 0);
    const demoLabel = (t: string) => (t === "minh-hoa" ? " · MINH HOẠ" : "");
    const mine = riasec ? matchMajor(riasec, major) : null;
    const items: ChatItem[] = [
      {
        title: "Hợp với xu hướng sở thích",
        meta: `${major.riasec.map((t) => `${t} – ${RIASEC_INFO[t].label}`).join(", ")}${mine !== null ? ` · mức phù hợp với bạn: ${mine}%` : ""}`,
      },
      { title: "Học phần tiêu biểu (độ khó phụ thuộc năng lực từng người)", meta: major.curriculum.flatMap((b) => b.items.map((i) => i.name)).slice(0, 5).join(", ") },
    ];
    if (outcome?.employmentRate) items.push({ title: "Tỷ lệ có việc làm trong 12 tháng", meta: `${vn(outcome.employmentRate.metric.value)}% · ${outcome.employmentRate.metric.year} · ${outcome.employmentRate.source.publisher}${demoLabel(outcome.employmentRate.source.trust)}` });
    if (outcome?.startingSalary) items.push({ title: "Lương khởi điểm (trung vị)", meta: `${vn(outcome.startingSalary.metric.value)} triệu/tháng · ${outcome.startingSalary.metric.year} · ${outcome.startingSalary.source.publisher}${demoLabel(outcome.startingSalary.source.trust)}` });
    if (ps.length) {
      items.push({
        title: `Đào tạo tại ${new Set(ps.map((p) => p.schoolId)).size} trường trên Trovio`,
        meta: `${cut.length ? `điểm chuẩn THPT ${formatMethodScore(Math.min(...cut))}–${formatMethodScore(Math.max(...cut))}` : "chưa có điểm chuẩn chính thức"}${fees.length ? ` · học phí ${vn(Math.min(...fees))}–${vn(Math.max(...fees))} triệu/năm` : ""}`,
        href: `/nganh/${major.slug}`,
      });
    }
    const demo = [outcome?.employmentRate, outcome?.startingSalary].some((m) => m && m.source.trust === "minh-hoa");
    return base(
      "evaluate",
      "answer",
      `Ngành ${major.name} "tốt" hay không tuỳ vào sở thích, năng lực và điều kiện của bạn — mình không đưa ra kết luận chung. Dưới đây là các dữ kiện để bạn tự cân nhắc:`,
      {
        context: ctx,
        items,
        note: `${demo ? "Số liệu việc làm theo ngành trong bản demo là MINH HOẠ. " : ""}${DEMO_NOTE}${mine === null ? " Làm trắc nghiệm RIASEC để biết mức phù hợp về sở thích của bạn." : ""}`,
        sources: [
          { label: `Chi tiết ngành ${major.name}`, href: `/nganh/${major.slug}` },
          { label: "Việc làm & thu nhập theo ngành", href: "/viec-lam" },
          ...(mine === null ? [{ label: "Làm trắc nghiệm RIASEC", href: "/trac-nghiem" }] : []),
        ],
        suggestions: [`Ngành ${major.name} học gì?`, `Trường nào đào tạo ngành ${major.name}?`, `Lương ngành ${major.name}`],
      },
    );
  }

  if (has(n, I.fit) && major) {
    const riasec = sanitizeRiasec(ctxIn.riasec);
    const mine = riasec ? matchMajor(riasec, major) : null;
    return base("fit", "answer", `Ngành ${major.name} hợp với người có xu hướng ${major.riasec.map((t) => `${RIASEC_INFO[t].label.toLowerCase()} (${t})`).join(", ")}.${mine !== null ? ` Theo kết quả trắc nghiệm của bạn (mã ${riasec!.code.join("-")}), mức phù hợp về sở thích là ${mine}%.` : " Bạn có thể làm trắc nghiệm RIASEC để biết mức phù hợp của mình."}`, {
      context: ctx,
      note: "Mức phù hợp chỉ xét sở thích nghề nghiệp; nên cân nhắc thêm năng lực học tập, điểm số và điều kiện tài chính.",
      items: major.riasec.map((t) => ({ title: `${t} – ${RIASEC_INFO[t].label}`, meta: RIASEC_INFO[t].desc })),
      sources: [{ label: "Làm trắc nghiệm RIASEC để kiểm tra", href: "/trac-nghiem" }, { label: `Ngành ${major.name}`, href: `/nganh/${major.slug}` }],
      suggestions: [`Ngành ${major.name} học gì?`, `Lương ngành ${major.name}`],
    });
  }

  if (major && (has(n, I.info) || has(n, I.jobs) || (!explicitSchool && words.length <= 8))) {
    const subjects = major.curriculum.flatMap((b) => b.items.map((i) => i.name)).slice(0, 6);
    return base("major-info", "answer", `${major.name}: ${major.summary}`, {
      context: ctx,
      items: [
        { title: "Học phần tiêu biểu", meta: subjects.join(", ") },
        { title: "Vị trí việc làm", meta: major.careers.map((c) => c.title).join(", ") },
        { title: "Hợp với xu hướng", meta: major.riasec.map((t) => `${t} – ${RIASEC_INFO[t].label}`).join(", ") },
      ],
      sources: [{ label: `Chi tiết ngành ${major.name}`, href: `/nganh/${major.slug}` }],
      suggestions: [`Điểm chuẩn ngành ${major.name}`, `Lương ngành ${major.name}`, `Trường nào đào tạo ngành ${major.name}?`],
    });
  }

  if (school && (!explicitMajor || words.length <= 8)) {
    const list = programsOf(null, school.id);
    return base("school-info", "answer", `${school.name} (${school.city}) — ${school.highlight}. Trovio có ${list.length} chương trình của trường.`, {
      context: ctx,
      items: list.slice(0, 6).map((p) => ({ title: p.name, meta: p.cutoffs[0] ? `Điểm chuẩn ${p.cutoffs[0].year}: ${formatMethodScore(p.cutoffs[0].score)}` : "Chưa có dữ liệu chính thức", href: `/chuong-trinh/${p.slug}`, programId: p.id })),
      note: DEMO_NOTE,
      sources: [{ label: `Trang trường ${school.shortName}`, href: `/truong/${school.slug}` }, { label: "Website chính thức", href: school.website, external: true }],
      suggestions: [`Học phí ${school.shortName}`, `Cảm nhận sinh viên ${school.shortName}`, `Học bổng ${school.shortName}`],
    });
  }

  if (has(n, I.compare)) {
    return base("compare", "answer", "Bạn có thể so sánh tối đa 3 chương trình (điểm chuẩn, học phí, phương thức, mức phù hợp) ở trang So sánh — bấm “Thêm so sánh” trên thẻ chương trình.", {
      sources: [{ label: "Mở trang So sánh", href: "/so-sanh" }, { label: "Việc làm theo ngành", href: "/viec-lam" }],
    });
  }

  // --- 5. Không đủ căn cứ để trả lời ---
  return base(
    "unknown",
    "unknown",
    "Mình chưa có thông tin đáng tin cậy để trả lời câu này nên sẽ không đoán. Bạn thử hỏi về một ngành hoặc trường cụ thể (điểm chuẩn, học phí, học gì, việc làm), hoặc xem mục Trợ giúp.",
    { context: ctx, sources: [{ label: "Trợ giúp & câu hỏi thường gặp", href: "/tro-giup" }], suggestions: defaultSuggestions() },
  );
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function defaultSuggestions() {
  return ["Ngành Marketing học gì?", "Điểm chuẩn ngành Công nghệ thông tin", "Lương ngành Kế toán", "Thứ tự nguyện vọng quan trọng thế nào?"];
}

/** Che thông tin cá nhân trước khi lưu câu hỏi vào nhật ký. */
export function maskQuestion(q: string): string {
  return q
    .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s.-]{7,}\d/g, "[số]")
    .slice(0, MAX_QUESTION);
}

/** Từ quá chung, không cho làm từ khoá (dễ khớp nhầm). */
const ALIAS_STOPWORDS = new Set(["nganh", "truong", "hoc", "diem", "co", "khong", "it", "ai", "neu", "gi", "nao", "dai hoc", "cao dang", "hoc phi", "luong", "viec lam", "ra truong"]);

export const chatbotService = {
  async listAliases() {
    const [aliases, majors, schools] = await Promise.all([repositories.chatAliases.list(), repositories.majors.findAll(), repositories.schools.findAll()]);
    const name = (a: ChatAlias) => (a.kind === "major" ? majors.find((m) => m.id === a.targetId)?.name : schools.find((s) => s.id === a.targetId)?.shortName) ?? a.targetId;
    return aliases.map((a) => ({ ...a, targetName: name(a) }));
  },

  async addAlias(admin: PublicUser, input: Record<string, unknown>): Promise<{ ok: true } | { ok: false; field: string; message: string }> {
    const label = String(input.alias ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 60);
    const alias = norm(label).trim();
    const kind = input.kind === "school" ? "school" : input.kind === "major" ? "major" : null;
    if (!kind) return { ok: false, field: "kind", message: "Chọn loại: ngành hoặc trường." };
    if (alias.length < 2 || alias.split(" ").join("").length < 2) return { ok: false, field: "alias", message: "Từ khoá cần ít nhất 2 ký tự chữ/số." };
    if (ALIAS_STOPWORDS.has(alias)) return { ok: false, field: "alias", message: "Từ khoá quá chung, dễ khớp nhầm câu hỏi khác." };
    const targetId = String(input.targetId ?? "");
    const k = await knowledge();
    const exists = kind === "major" ? k.majors.some((m) => m.id === targetId) : k.schools.some((s) => s.id === targetId);
    if (!exists) return { ok: false, field: "targetId", message: "Không tìm thấy ngành/trường." };
    const index = kind === "major" ? k.majorIndex : k.schoolIndex;
    const clash = index.find(([a, id]) => a === alias && id !== targetId);
    if (clash) return { ok: false, field: "alias", message: "Từ khoá này đang trỏ tới một ngành/trường khác." };
    await repositories.chatAliases.add({ id: randomUUID(), alias, label, kind, targetId, createdAt: new Date().toISOString(), createdBy: admin.id });
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: admin.id,
      actorEmail: admin.email,
      programId: targetId,
      targetType: "chat-alias",
      action: "create",
      changes: [{ field: "alias", before: "—", after: label }],
    });
    return { ok: true };
  },

  async deleteAlias(admin: PublicUser, id: string): Promise<boolean> {
    const all = await repositories.chatAliases.list();
    const a = all.find((x) => x.id === id);
    if (!a || !(await repositories.chatAliases.delete(id))) return false;
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: admin.id,
      actorEmail: admin.email,
      programId: a.targetId,
      targetType: "chat-alias",
      action: "delete",
      changes: [{ field: "alias", before: a.label, after: "—" }],
    });
    return true;
  },

  async ask(question: unknown, ctx: ChatContextIn = {}): Promise<{ ok: true; answer: ChatAnswer; logId: string } | { ok: false; message: string }> {
    const q = typeof question === "string" ? question.replace(/[\u0000-\u001F\u007F]/g, " ").trim() : "";
    if (q.length < 2) return { ok: false, message: "Bạn hãy nhập câu hỏi nhé." };
    if (q.length > MAX_QUESTION) return { ok: false, message: `Câu hỏi tối đa ${MAX_QUESTION} ký tự.` };
    let answer = await answerQuestion(q, ctx);
    if (answer.kind === "answer") {
      const polished = await polishWithLlm(q, answer).catch(() => null);
      if (polished) answer = { ...answer, text: polished, polished: true };
    }
    const logId = randomUUID();
    await repositories.chatLogs.add({ id: logId, at: new Date().toISOString(), question: maskQuestion(q), intent: answer.intent, kind: answer.kind, helpful: null });
    return { ok: true, answer, logId };
  },

  feedback(logId: string, helpful: boolean) {
    return repositories.chatLogs.setHelpful(logId, helpful);
  },

  async stats(limit = 200) {
    const logs = await repositories.chatLogs.list(limit);
    const count = (f: (l: (typeof logs)[number]) => boolean) => logs.filter(f).length;
    return {
      total: logs.length,
      answered: count((l) => l.kind === "answer"),
      refused: count((l) => l.kind === "refusal"),
      unknown: count((l) => l.kind === "unknown" || l.kind === "clarify"),
      negative: count((l) => l.helpful === false),
      positive: count((l) => l.helpful === true),
      byIntent: Object.entries(
        logs.reduce<Record<string, number>>((acc, l) => ((acc[l.intent] = (acc[l.intent] ?? 0) + 1), acc), {}),
      ).sort((a, b) => b[1] - a[1]),
      needsReview: logs.filter((l) => l.kind === "unknown" || l.kind === "clarify" || l.helpful === false).slice(0, 50),
      recent: logs.slice(0, 20),
    };
  },
};
