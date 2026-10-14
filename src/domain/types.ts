/**
 * DOMAIN LAYER
 * Kiểu dữ liệu thuần (entity, value object). Không phụ thuộc framework, không import từ lớp khác.
 */

export type Region = "bac" | "trung" | "nam";
export type SchoolType = "cong-lap" | "tu-thuc" | "quoc-te";
export type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";
export type Competition = "Cao" | "Trung bình" | "Thấp";
export type FitLevel = "an-toan" | "vua-suc" | "thu-suc";

/** Phương thức xét tuyển có điểm chuẩn để so sánh (THPT, Học bạ, ĐGNL HN, ĐGNL HCM, TSA Bách Khoa). */
export type AdmissionMethodKey = "thpt" | "hocba" | "dgnl-hn" | "dgnl-hcm" | "tsa";
export type AltMethodKey = Exclude<AdmissionMethodKey, "thpt">;

/** Khu vực ưu tiên theo quy chế tuyển sinh. */
export type PriorityRegion = "KV1" | "KV2-NT" | "KV2" | "KV3";
/** Nhóm đối tượng ưu tiên. */
export type PriorityGroup = "none" | "UT1" | "UT2";

export interface Subject {
  id: string;
  name: string;
  short: string;
}

export interface Combo {
  code: string;
  subjects: [string, string, string]; // subject ids
}

export interface School {
  id: string;
  slug: string;
  code: string;
  name: string;
  shortName: string;
  type: SchoolType;
  region: Region;
  city: string;
  campuses: string[];
  founded: number;
  students: number;
  highlight: string;
  website: string;
  description: string;
  scholarships: string;
  /** Quản trị viên tạm ẩn (không hiện cho học sinh). */
  hidden?: boolean;
  /** Bản ghi do quản trị viên thêm (không có trong dữ liệu gốc). */
  custom?: boolean;
}

export interface MajorGroup {
  id: string;
  slug: string;
  name: string;
  icon: string; // key trong bảng icon của lớp UI
  tone: "primary" | "accent" | "success" | "danger" | "pink" | "teal" | "violet" | "slate";
}

export interface CurriculumBlock {
  title: string;
  items: { name: string; desc: string }[];
}

export interface Career {
  title: string;
  salary: string; // "15 - 22 triệu/tháng"
  desc: string;
  level: "Quản lý & chiến lược" | "Thực thi & chuyên môn";
}

export interface Major {
  id: string;
  slug: string;
  code: string;
  name: string;
  groupId: string;
  riasec: [RiasecType, RiasecType, RiasecType];
  summary: string;
  description: string;
  curriculum: CurriculumBlock[];
  careers: Career[];
  demand: "Rất cao" | "Cao" | "Trung bình";
  growth: number; // % tăng trưởng nhu cầu tuyển dụng/năm
  hidden?: boolean;
  custom?: boolean;
}

export interface CutoffScore {
  year: number;
  score: number;
  estimated?: boolean;
}

export interface MethodCutoff {
  method: AltMethodKey;
  year: number;
  score: number;
  /** true = số ƯỚC TÍNH (suy ra từ điểm thi THPT), chưa phải điểm trường công bố. Quản trị viên nhập số thật → false. */
  estimated?: boolean;
}

export interface AdmissionMethod {
  /** Gắn với phương thức có điểm chuẩn → phần "Yêu cầu" được tính từ dữ liệu điểm chuẩn hiện hành. */
  key?: AdmissionMethodKey;
  name: string;
  desc: string;
  requirement: string;
  tag: string;
}

export interface Program {
  id: string;
  slug: string;
  schoolId: string;
  majorId: string;
  name: string;
  admissionCode: string;
  trainingType: "Chính quy" | "Chất lượng cao" | "Tiên tiến" | "Quốc tế";
  campus: string;
  combos: string[];
  /** Điểm chuẩn phương thức điểm thi THPT, thang 30. Rỗng nếu trường không xét điểm thi. */
  cutoffs: CutoffScore[];
  /** Điểm chuẩn gần nhất của các phương thức khác (học bạ thang 30, ĐGNL HN thang 150, ĐGNL HCM thang 1200). */
  altCutoffs: MethodCutoff[];
  tuitionMin: number; // triệu đồng/năm
  tuitionMax: number;
  durationYears: number;
  quota: number;
  competition: Competition;
  methods: AdmissionMethod[];
  overview: string;
  updatedAt: string; // YYYY-MM
  source: string;
  /** Ngày (YYYY-MM-DD) phòng tuyển sinh của trường xác nhận số liệu; hết hiệu lực sau 12 tháng. */
  schoolVerifiedAt?: string | null;
  /** Ghi chú xác nhận (ai xác nhận, theo văn bản nào). */
  schoolVerifiedNote?: string | null;
  /** Ngày trường xác nhận từng nhóm số liệu (cổng trường). */
  verifiedFields?: Partial<Record<VerifyField, string>>;
  /** Nguồn tham chiếu chính thức (https) + ngày kiểm tra + ghi chú đối soát của quản trị viên. */
  sourceUrl?: string | null;
  sourceCheckedAt?: string | null;
  sourceNote?: string | null;
  /** Ngày quản trị viên xác minh số liệu với nguồn (A05 "Xác minh hàng loạt"). */
  adminVerifiedAt?: string | null;
  hidden?: boolean;
  custom?: boolean;
}

/** Nhóm số liệu trường xác nhận trên cổng trường. */
export type VerifyField = "cutoff" | "tuition" | "quota" | "combos";

export interface RiasecQuestion {
  id: number;
  type: RiasecType;
  text: string;
  /** Quản trị: tạm ẩn khỏi bài làm; câu do quản trị viên thêm. */
  hidden?: boolean;
  custom?: boolean;
}

/** "school" = cán bộ tuyển sinh của trường (cổng trường, cần quản trị viên duyệt). */
export type UserRole = "student" | "parent" | "teacher" | "school";

/** Yêu cầu làm cán bộ tuyển sinh: tự nhận diện trường theo tên miền email, quản trị viên duyệt thủ công. */
export interface SchoolStaff {
  schoolId: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedAt?: string | null;
}

export type TeacherVerificationStatus = "none" | "pending" | "verified" | "rejected" | "revoked";

export interface TeacherVerification {
  id: string;
  userId: string;
  schoolName: string;
  province: string;
  department?: string;
  evidenceNotes: string;
  status: TeacherVerificationStatus;
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}

export interface StudentShareConsent {
  shareName: boolean;
  shareProgress: boolean;
  shareRiasec: boolean;
  shareWishlist: boolean;
  shareConsultation: boolean;
  updatedAt: string;
}

export const DEFAULT_STUDENT_CONSENT: StudentShareConsent = {
  shareName: true,
  shareProgress: true,
  shareRiasec: false,
  shareWishlist: false,
  shareConsultation: false,
  updatedAt: "2026-10-11T00:00:00.000Z",
};

/**
 * Tài khoản người dùng. Một người có thể đăng nhập bằng mật khẩu, bằng Google hoặc cả hai
 * (liên kết theo cùng email). Không thu thập SĐT, ngày sinh, CCCD.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** scrypt hash; null nếu tài khoản chỉ đăng nhập bằng Google. */
  passwordHash: string | null;
  /** `sub` do Google cấp; null nếu chưa liên kết Google. */
  googleId: string | null;
  createdAt: string;
  verified: boolean;
  locked: boolean;
  /** Thời điểm tự mở khoá khi bị khoá tạm thời do đăng nhập sai nhiều lần liên tiếp. */
  lockUntil?: string | null;
  failedAttempts: number;
  /** Quản trị viên dữ liệu (xem /quan-tri). */
  admin?: boolean;
  /** Tăng lên khi đổi/đặt lại mật khẩu hoặc "đăng xuất mọi thiết bị" → mọi phiên cũ mất hiệu lực. */
  sessionVersion?: number;
  /** Mã xác thực email đã băm và hạn dùng. */
  emailOtpHash?: string | null;
  emailOtpExpires?: string | null;
  // Hồ sơ bổ sung (onboarding, đều tuỳ chọn)
  role: UserRole | null;
  teacherVerificationStatus?: TeacherVerificationStatus;
  teacherVerificationId?: string | null;
  gradYear: number | null;
  province: string | null;
  /** Người dùng dưới 16 tuổi cần phụ huynh đồng ý (Nghị định 13/2023/NĐ-CP). */
  under16: boolean;
  parentConsent: boolean;
  onboarded: boolean;
  /** Đồng ý nhận email nhắc hạn tuyển sinh cho các mốc đã bật "Nhắc tôi". */
  emailReminders?: boolean;
  /** Bị quản trị viên khoá: không đăng nhập được (kể cả Google, đặt lại mật khẩu) và mọi phiên mất hiệu lực. */
  disabled?: boolean;
  /** Lần đăng nhập gần nhất (thống kê quản trị). */
  lastLoginAt?: string | null;
  /** Kiểm duyệt viên: vào được mục kiểm duyệt cảm nhận, hỏi đáp, báo lỗi. */
  moderator?: boolean;
  schoolStaff?: SchoolStaff | null;
  /** Đồng ý nhận lời mời khảo sát sau 1 năm (mặc định tắt). */
  surveyOptIn?: boolean;
  surveyOptInAt?: string | null;
  surveyInvitedAt?: string | null;
}

/** Dữ liệu an toàn để gửi ra client (không có hash mật khẩu, id Google). */
export type PublicUser = Omit<User, "passwordHash" | "googleId" | "failedAttempts" | "sessionVersion" | "emailOtpHash" | "emailOtpExpires" | "admin"> & {
  hasPassword: boolean;
  hasGoogle: boolean;
  admin: boolean;
};

/** Hồ sơ điểm của học sinh (S07). */
export interface ScoreProfile {
  /** Phương thức của hồ sơ điểm; thiếu = "thpt" (hồ sơ tạo trước khi có tính năng này). */
  method?: AdmissionMethodKey;
  /** Tổ hợp môn (THPT, học bạ). Rỗng với ĐGNL. */
  combo: string;
  scores: Record<string, number>;
  priorityRegion: PriorityRegion;
  priorityGroup: PriorityGroup;
  regions: Region[];
  budgetMax: number | null; // triệu/năm
  schoolTypes: SchoolType[];
  groupIds: string[];
}

export interface AdmissionScore {
  rawTotal: number;
  priorityPoints: number;
  priorityApplied: number;
  total: number;
  reduced: boolean;
}

export interface RiasecResult {
  percents: Record<RiasecType, number>;
  ranking: RiasecType[];
  code: [RiasecType, RiasecType, RiasecType];
  completedAt: string;
  answered: number;
  /** Độ phân hóa của kết quả (độ lệch chuẩn giữa 6 nhóm). < 8 = chưa phân hóa rõ nét (flat profile). */
  differentiation?: number;
  /** Đánh dấu bài làm chọn quá đều cần nhắc nhở học sinh làm lại cẩn thận. */
  isFlatProfile?: boolean;
  /** Các nhóm có điểm xấp xỉ nhau (chênh <= 2%) cần xem xét như profile kết hợp */
  tiedDimensions?: RiasecType[];
  /** Ghi chú khoa học: công cụ định hướng tham khảo, không cấu thành chẩn đoán tâm lý lâm sàng */
  caveat?: string;
  confidenceScore?: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

/** Một dòng trong danh sách nguyện vọng dự kiến. */
export interface WishlistItem {
  id: string;
  note: string;
}

export interface StoredProfile extends ScoreProfile {
  admission: AdmissionScore;
  updatedAt: string;
}

export interface StoredQuiz {
  result: RiasecResult;
  savedToProfile: boolean;
}

/** 4 trục của mini-test "Phong cách làm việc" (xem domain/work-style.ts). */
export type WorkAxis = "social" | "stability" | "hands" | "detail";

/** Kết quả mini-test: điểm mỗi trục ∈ {−3, −1, +1, +3} (dương = cực trái). Chỉ để giải thích, không tính điểm. */
export interface StoredWorkStyle {
  scores: Record<WorkAxis, number>;
  completedAt: string;
}

/** Mã MBTI học sinh tự nhập — góc nhìn tham khảo, không tính điểm. */
export interface StoredMbti {
  code: string;
  updatedAt: string;
}

/** Dữ liệu cá nhân được đồng bộ theo tài khoản (đa thiết bị). */
export interface UserData {
  saved: string[];
  wishlist: WishlistItem[];
  profile: StoredProfile | null;
  quiz: StoredQuiz | null;
  /** id các mốc tuyển sinh người dùng bật "Nhắc tôi". */
  reminders: string[];
  /** Mục tiêu đặt qua hội thoại (/muc-tieu); thiếu = chưa đặt. */
  goal?: Goal | null;
  /** Mini-test phong cách làm việc; thiếu = chưa làm. */
  workStyle?: StoredWorkStyle | null;
  /** Mã MBTI tự nhập; thiếu = chưa nhập. */
  mbti?: StoredMbti | null;
  updatedAt: string;
}

/** Mục tiêu chọn ngành của học sinh (đặt qua hội thoại). */
export interface Goal {
  majorId: string | null;
  method: AdmissionMethodKey;
  /** Tổ hợp (THPT/học bạ); null nếu chưa chọn hoặc ĐGNL. */
  combo: string | null;
  /** Điểm mục tiêu theo thang của phương thức. */
  targetScore: number | null;
  /** Chương trình dùng làm mốc so sánh điểm chuẩn 3 năm. */
  refProgramId: string | null;
  regions: Region[];
  budgetMax: number | null;
  updatedAt: string;
}

/** Link chỉ xem danh sách nguyện vọng, gửi cho phụ huynh. */
export interface Share {
  id: string; // chuỗi ngẫu nhiên 144 bit, cũng là phần bí mật trên URL
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  showNotes: boolean;
  showScore: boolean;
}

export interface ShareComment {
  id: string;
  shareId: string;
  ownerId: string;
  name: string;
  message: string;
  programId: string | null;
  createdAt: string;
  read: boolean;
}

/** Phần dữ liệu chương trình quản trị viên được phép chỉnh (lưu dạng ghi đè lên dữ liệu gốc). */
export type ProgramPatch = Partial<Pick<Program, "cutoffs" | "altCutoffs" | "tuitionMin" | "tuitionMax" | "quota" | "source" | "updatedAt" | "schoolVerifiedAt" | "schoolVerifiedNote" | "verifiedFields" | "sourceUrl" | "sourceCheckedAt" | "sourceNote" | "adminVerifiedAt" | "hidden" | "combos" | "name" | "admissionCode" | "trainingType" | "campus" | "durationYears">>;

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorEmail: string;
  /** id đối tượng bị thay đổi (tên trường giữ nguyên để tương thích nhật ký cũ). */
  programId: string;
  /** Loại đối tượng; thiếu = chương trình. */
  targetType?: "program" | "major-outcome" | "source" | "review" | "report" | "timeline" | "chat-alias" | "school" | "major" | "quiz" | "rules" | "import" | "user" | "school-submission";
  action: "update" | "verify" | "reset" | "approve" | "reject" | "delete" | "create";
  changes: { field: string; before: string; after: string }[];
}

// ---------------------------------------------------------------------------
// Việc làm & thu nhập — mọi con số đều phải gắn với một nguồn.
// ---------------------------------------------------------------------------

export type SourceKind = "van-ban" | "thong-ke" | "khao-sat-truong" | "bao-chi" | "khao-sat-doanh-nghiep" | "minh-hoa";
/** Mức tin cậy hiển thị cho người dùng. */
export type TrustLevel = "cao" | "trung-binh" | "tham-khao" | "minh-hoa";

export interface DataSource {
  id: string;
  title: string;
  publisher: string;
  year: number;
  url: string | null;
  kind: SourceKind;
  trust: TrustLevel;
  /** Phương pháp / phạm vi / điều cần lưu ý khi đọc số liệu. */
  note: string;
  accessedAt: string; // YYYY-MM-DD
}

export interface OutcomeMetric {
  value: number;
  low?: number;
  high?: number;
  year: number;
  sourceId: string;
  sampleSize?: number;
  note?: string;
}

/** Kết quả đầu ra theo ngành (toàn quốc / tổng hợp). */
export interface MajorOutcome {
  majorId: string;
  /** % người tốt nghiệp có việc làm trong 12 tháng. */
  employmentRate?: OutcomeMetric;
  /** Lương khởi điểm (triệu đồng/tháng): value = trung vị, low–high = khoảng phổ biến. */
  startingSalary?: OutcomeMetric;
  /** Thu nhập sau 3–5 năm (triệu đồng/tháng). */
  experiencedSalary?: OutcomeMetric;
  updatedAt: string; // YYYY-MM
}

/** Kết quả khảo sát việc làm do từng trường công bố. */
export interface SchoolOutcome {
  schoolId: string;
  employmentRate?: OutcomeMetric;
  /** Thông tin thu nhập dạng mô tả (VD: "72% có lương trên 9 triệu/tháng"). */
  salaryNote?: { text: string; year: number; sourceId: string };
  cohort?: string;
}

/** Mốc so sánh cả nước (số liệu thống kê chính thức). */
export interface Benchmark {
  id: string;
  label: string;
  value: number;
  unit: string;
  year: number;
  sourceId: string;
}

// ---------------------------------------------------------------------------
// Cảm nhận sinh viên (kiểm duyệt trước khi hiển thị)
// ---------------------------------------------------------------------------

export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";
export type ReviewCriterion = "teaching" | "facilities" | "activities" | "career";

export interface SchoolReview {
  id: string;
  schoolId: string;
  userId: string;
  authorName: string;
  anonymous: boolean;
  relation: "sinh-vien" | "cuu-sinh-vien";
  cohort: number | null;
  majorId: string | null;
  ratings: Record<ReviewCriterion, number>;
  title: string;
  content: string;
  status: ReviewStatus;
  /** Cờ do bộ lọc tự động gắn để người kiểm duyệt chú ý. */
  flags: string[];
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
  moderatedBy: string | null;
  helpful: string[];
  reports: { by: string; reason: string; at: string }[];
  /** Email tài khoản thuộc tên miền của trường. */
  schoolEmail: boolean;
  /** Dữ liệu minh hoạ của bản demo. */
  demo?: boolean;
}

// ---------------------------------------------------------------------------
// Chatbot
// ---------------------------------------------------------------------------

export interface ChatLog {
  id: string;
  at: string;
  /** Câu hỏi đã che số điện thoại/email, cắt ≤ 300 ký tự. */
  question: string;
  intent: string;
  kind: "answer" | "refusal" | "clarify" | "unknown";
  helpful: boolean | null;
}

/** Mốc tuyển sinh (cấu hình theo năm). */
export interface TimelineEvent {
  id: string;
  title: string;
  start: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
  category: "thi" | "dang-ky" | "ket-qua" | "nhap-hoc" | "dgnl";
  desc: string;
}


// ---------------------------------------------------------------------------
// Báo dữ liệu sai, thông báo, cấu hình mốc tuyển sinh, từ khoá chatbot, thống kê, khảo sát
// ---------------------------------------------------------------------------

export type DataReportStatus = "moi" | "dang-xu-ly" | "da-xu-ly" | "khong-hop-le";

/** Báo dữ liệu sai do người dùng gửi từ trang Trợ giúp / trang chương trình. */
export interface DataReport {
  id: string;
  /** Chương trình liên quan (nếu gửi từ trang chương trình hoặc chọn được). */
  programId: string | null;
  /** Người dùng tự mô tả trang/chương trình liên quan. */
  page: string;
  topic: "diem-chuan" | "hoc-phi" | "chi-tieu" | "to-hop" | "thong-tin-truong" | "khac";
  detail: string;
  /** Email nhận phản hồi (tuỳ chọn; chỉ quản trị viên xem). */
  email: string | null;
  userId: string | null;
  status: DataReportStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  handledBy: string | null;
}

export type NotificationKind = "review-approved" | "review-rejected" | "report-update" | "reminder" | "supplementary" | "class-reminder" | "qa-answer" | "survey-invite" | "school-submission";

/** Đợt xét tuyển bổ sung được quản trị và lưu trong PostgreSQL. */
export interface SupplementaryRound {
  id: string;
  programId: string;
  quota: number;
  minScore: number;
  combos: string[];
  opens: string;
  closes: string;
  note: string;
}

export type AidCondition = "ho-ngheo" | "dan-toc" | "khuyet-tat" | "nguoi-co-cong" | "hoc-luc-tot" | "o-xa";
export interface AidPolicy {
  id: string;
  title: string;
  when: AidCondition[];
  summary: string;
  how: string;
  source: string;
}
export interface FinancialAidConfig {
  conditions: { key: AidCondition; label: string }[];
  policies: AidPolicy[];
  dormEstimate: Record<SchoolType, { min: number; max: number } | null>;
  rentEstimate: number;
}

/** Thông báo trong web (chuông trên thanh menu). */
export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  read: boolean;
}

/** Lịch tuyển sinh do quản trị viên cập nhật (ghi đè file cấu hình). */
export interface TimelineConfig {
  season: string;
  /** true = đã đối chiếu lịch chính thức của Bộ GD&ĐT (bắt buộc có đường dẫn nguồn). */
  official: boolean;
  sourceUrl: string | null;
  note: string;
  events: TimelineEvent[];
  updatedAt: string;
  updatedBy: string;
}

/** Từ khoá/cách gọi khác do quản trị viên thêm để chatbot nhận ra ngành/trường. */
export interface ChatAlias {
  id: string;
  /** Dạng đã chuẩn hoá (bỏ dấu, chữ thường). */
  alias: string;
  /** Cách viết gốc để hiển thị. */
  label: string;
  kind: "major" | "school";
  targetId: string;
  createdAt: string;
  createdBy: string;
}

/** Sự kiện đo phễu hành vi (ẩn danh, không gắn tài khoản). */
/** quiz_started / style_done / mbti_added: hành vi phụ (đo tỉ lệ làm hết bài RIASEC, dùng mini-test phong cách, nhập mã MBTI). */
export const FUNNEL_EVENTS = ["visit", "quiz_done", "score_saved", "program_saved", "wishlist_added", "share_created", "chat_asked", "quiz_started", "style_done", "mbti_added"] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** Phiếu khảo sát mức độ dễ dùng SUS (System Usability Scale, 10 câu, thang 1–5). */
export interface SusResponse {
  id: string;
  at: string;
  answers: number[];
  /** 0–100 theo công thức SUS chuẩn. */
  score: number;
  role: string | null;
  comment: string | null;
}

/** Câu hỏi của học sinh gửi sinh viên đang học (hỏi đáp theo chương trình). */
export interface QaAnswer {
  id: string;
  userId: string;
  /** Tên hiển thị rút gọn (VD "Linh N."). */
  displayName: string;
  /** Email trường (.edu.vn) đã dùng để xác thực — chỉ lưu tên miền, không lưu email đầy đủ. */
  schoolDomain: string;
  text: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  helpful: number;
  /** Tài khoản đã bấm "Hữu ích" / "Báo cáo" (mỗi tài khoản 1 lần). 3 báo cáo → ẩn, quay lại hàng chờ duyệt. */
  helpfulBy?: string[];
  reportedBy?: string[];
}

export interface QaQuestion {
  id: string;
  programId: string;
  /** null = khách ẩn danh. */
  userId: string | null;
  text: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  answers: QaAnswer[];
  demo?: boolean;
}

/** Lớp do giáo viên chủ nhiệm tạo; học sinh tự tham gia bằng mã mời và tự đồng ý chia sẻ tiến độ. */
export interface TeacherClass {
  id: string;
  teacherId: string;
  name: string;
  school: string;
  code: string;
  /** Hạn dùng của mã tham gia (mặc định 7 ngày kể từ khi tạo). */
  codeExpiresAt?: string | null;
  /** Đã thu hồi mã (không cho phép tham gia mới bằng mã này). */
  codeRevoked?: boolean;
  createdAt: string;
  memberIds: string[];
  lastRemindAt: string | null;
  /** Lần nhắc riêng gần nhất cho từng học sinh (giới hạn 1 lần / 24 giờ / học sinh). */
  memberRemindAt?: Record<string, string>;
  /** Quyền chia sẻ dữ liệu từng học sinh cấp cho lớp này: memberId -> StudentShareConsent */
  memberConsents?: Record<string, StudentShareConsent>;
}

/** Phản hồi sau 1 năm học (ẩn danh khi công bố). */
export interface OutcomeSurvey {
  id: string;
  programId: string;
  userId: string | null;
  satisfaction: 1 | 2 | 3 | 4 | 5;
  chooseAgain: "yes" | "no" | "unsure";
  /** "Sẽ chọn lại trường này" (thêm từ 10/2026; phản hồi cũ không có). */
  chooseSchoolAgain?: "yes" | "no" | "unsure";
  trovioRight: "yes" | "no" | "unsure";
  wish: string;
  cohort: number;
  createdAt: string;
  demo?: boolean;
}


// ---------------------------------------------------------------------------
// Quản trị nâng cao (A01–A09) & cổng trường
// ---------------------------------------------------------------------------

/** Cấu hình bài trắc nghiệm do quản trị viên chỉnh (ghi đè dữ liệu gốc). */
export interface QuizConfig {
  /** Sửa / ẩn câu gốc theo id. */
  overrides: Record<number, { text?: string; type?: RiasecType; hidden?: boolean }>;
  /** Câu do quản trị viên thêm (id ≥ 1000). */
  custom: RiasecQuestion[];
  /** Trọng số ưu tiên gợi ý theo nhóm Holland chính của ngành (mặc định 1.0). */
  typeWeights: Record<RiasecType, number>;
  updatedAt: string | null;
}

export type RecRuleKind = "riasec-match" | "budget" | "diversity" | "goal-priority" | "min-years" | "boost-cutoff" | "boost-school-type";
export type RecRuleStatus = "active" | "draft" | "disabled";

export interface RecRule {
  id: string;
  kind: RecRuleKind;
  name: string;
  description: string;
  version: string;
  status: RecRuleStatus;
  params: Record<string, number | string>;
  builtin: boolean;
  updatedAt: string;
}

export interface RecommendConfig {
  /** Trọng số 4 tiêu chí (tổng = 100). */
  weights: { interest: number; fit: number; place: number; group: number };
  rules: RecRule[];
  updatedAt: string | null;
}

/** Một lượt nhập dữ liệu hàng loạt (A07). */
export interface ImportBatch {
  id: string;
  fileName: string;
  byId: string;
  byName: string;
  at: string;
  valid: number;
  errors: number;
  warnings: number;
  created: number;
  updated: number;
}

/** Trường gửi bản sửa số liệu qua cổng trường — quản trị viên duyệt rồi mới áp dụng. */
export interface SchoolSubmission {
  id: string;
  schoolId: string;
  programId: string;
  userId: string;
  field: VerifyField;
  current: string;
  proposed: string;
  evidenceUrl: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  adminNote: string | null;
}
