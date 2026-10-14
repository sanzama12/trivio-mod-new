/**
 * REPOSITORY LAYER — hợp đồng truy cập dữ liệu.
 * Lớp service chỉ phụ thuộc vào các interface này. Muốn chuyển sang database (Prisma, Postgres…)
 * chỉ cần viết implementation mới và đổi trong `repositories/index.ts`.
 */
import type {
  ImportBatch,
  QuizConfig,
  RecommendConfig,
  SchoolSubmission,
  AppNotification,
  OutcomeSurvey,
  QaQuestion,
  TeacherClass,
  TeacherVerification,
  TeacherVerificationStatus,
  ChatAlias,
  DataReport,
  DataReportStatus,
  FunnelEvent,
  SusResponse,
  TimelineConfig,
  AuditEntry,
  Benchmark,
  ChatLog,
  DataSource,
  MajorOutcome,
  SchoolOutcome,
  SchoolReview,
  Combo,
  FaqGroup,
  FinancialAidConfig,
  Major,
  MajorGroup,
  Program,
  ProgramPatch,
  RiasecQuestion,
  School,
  Share,
  ShareComment,
  Subject,
  SupplementaryRound,
  TimelineEvent,
  User,
  UserData,
} from "../domain/types";

export interface SchoolRepository {
  findAll(): Promise<School[]>;
  findById(id: string): Promise<School | null>;
  findBySlug(slug: string): Promise<School | null>;
}

export interface MajorRepository {
  findAll(): Promise<Major[]>;
  findById(id: string): Promise<Major | null>;
  findBySlug(slug: string): Promise<Major | null>;
  findGroups(): Promise<MajorGroup[]>;
}

export interface ProgramRepository {
  findAll(): Promise<Program[]>;
  findById(id: string): Promise<Program | null>;
  findBySlug(slug: string): Promise<Program | null>;
  findByIds(ids: string[]): Promise<Program[]>;
  findBySchool(schoolId: string): Promise<Program[]>;
  findByMajor(majorId: string): Promise<Program[]>;
}

export interface CatalogRepository {
  findSubjects(): Promise<Subject[]>;
  findCombos(): Promise<Combo[]>;
  findFaq(): Promise<FaqGroup[]>;
  findFinancialAid(): Promise<FinancialAidConfig | null>;
}

export interface QuizRepository {
  findQuestions(): Promise<RiasecQuestion[]>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  /** Toàn bộ tài khoản (dùng cho tác vụ nền như gửi nhắc hạn). */
  list(): Promise<User[]>;
  create(input: Omit<User, "id" | "createdAt">): Promise<User>;
  update(id: string, patch: Partial<Omit<User, "id">>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

/** Dữ liệu cá nhân đồng bộ theo tài khoản: đã lưu, nguyện vọng, hồ sơ điểm, kết quả trắc nghiệm. */
export interface UserDataRepository {
  get(userId: string): Promise<UserData | null>;
  put(userId: string, data: UserData): Promise<UserData>;
  delete(userId: string): Promise<void>;
}

/** Link chia sẻ chỉ xem cho phụ huynh. */
export interface ShareRepository {
  create(share: Share): Promise<Share>;
  findById(id: string): Promise<Share | null>;
  listByUser(userId: string): Promise<Share[]>;
  update(id: string, patch: Partial<Omit<Share, "id" | "userId">>): Promise<Share | null>;
}

export interface CommentRepository {
  add(comment: ShareComment): Promise<ShareComment>;
  listByOwner(ownerId: string): Promise<ShareComment[]>;
  countByShare(shareId: string): Promise<number>;
  delete(id: string, ownerId: string): Promise<boolean>;
  markAllRead(ownerId: string): Promise<void>;
}

/** Dữ liệu chương trình do quản trị viên chỉnh (ghi đè lên dữ liệu gốc) + nhật ký thay đổi. */
export interface ProgramAdminRepository {
  getOverride(programId: string): Promise<ProgramPatch | null>;
  setOverride(programId: string, patch: ProgramPatch | null, audit: AuditEntry): Promise<void>;
  listAudit(limit?: number): Promise<AuditEntry[]>;
}

export interface TimelineRepository {
  findAll(): Promise<TimelineEvent[]>;
}

/** Nhật ký thay đổi dùng chung (chương trình, số liệu việc làm, kiểm duyệt cảm nhận). */
export interface AuditRepository {
  append(entry: AuditEntry): Promise<void>;
  list(limit?: number, filter?: { targetType?: AuditEntry["targetType"]; targetId?: string }): Promise<AuditEntry[]>;
}

/** Số liệu việc làm & thu nhập: dữ liệu gốc + phần quản trị viên cập nhật. */
export interface OutcomeRepository {
  listSources(): Promise<DataSource[]>;
  listBenchmarks(): Promise<Benchmark[]>;
  listMajorOutcomes(): Promise<MajorOutcome[]>;
  listSchoolOutcomes(): Promise<SchoolOutcome[]>;
  setMajorOutcome(outcome: MajorOutcome): Promise<void>;
  resetMajorOutcome(majorId: string): Promise<boolean>;
  addSource(source: DataSource): Promise<void>;
}

export interface ReviewRepository {
  create(review: SchoolReview): Promise<SchoolReview>;
  update(id: string, patch: Partial<Omit<SchoolReview, "id">>): Promise<SchoolReview | null>;
  findById(id: string): Promise<SchoolReview | null>;
  findByUserAndSchool(userId: string, schoolId: string): Promise<SchoolReview | null>;
  listBySchool(schoolId: string): Promise<SchoolReview[]>;
  listByStatus(statuses: SchoolReview["status"][]): Promise<SchoolReview[]>;
  delete(id: string): Promise<boolean>;
}

export interface ChatLogRepository {
  add(log: ChatLog): Promise<void>;
  setHelpful(id: string, helpful: boolean): Promise<boolean>;
  list(limit?: number): Promise<ChatLog[]>;
}

export interface DataReportRepository {
  create(report: DataReport): Promise<DataReport>;
  update(id: string, patch: Partial<Omit<DataReport, "id">>): Promise<DataReport | null>;
  findById(id: string): Promise<DataReport | null>;
  list(filter?: { status?: DataReportStatus[] }): Promise<DataReport[]>;
}

export interface NotificationRepository {
  add(n: AppNotification): Promise<void>;
  listByUser(userId: string, limit?: number): Promise<AppNotification[]>;
  /** Đánh dấu đã đọc: danh sách id, hoặc tất cả khi không truyền. */
  markRead(userId: string, ids?: string[]): Promise<number>;
}

/** Lịch tuyển sinh quản trị viên đã cập nhật (null = dùng file cấu hình gốc). */
export interface TimelineConfigRepository {
  get(): Promise<TimelineConfig | null>;
  set(config: TimelineConfig | null): Promise<void>;
}

export interface ChatAliasRepository {
  list(): Promise<ChatAlias[]>;
  add(alias: ChatAlias): Promise<void>;
  delete(id: string): Promise<boolean>;
}

/** Đếm người dùng ẩn danh (không trùng lặp) theo ngày × sự kiện. */
export interface AnalyticsRepository {
  record(day: string, event: FunnelEvent, anonId: string): Promise<void>;
  /** Số mã ẩn danh khác nhau cho mỗi sự kiện trong khoảng ngày [from, to]. */
  summary(from: string, to: string): Promise<Record<FunnelEvent, number>>;
  /** Số lượt theo ngày (để vẽ xu hướng). */
  daily(from: string, to: string): Promise<{ day: string; counts: Record<FunnelEvent, number> }[]>;
}

export interface SurveyRepository {
  add(r: SusResponse): Promise<void>;
  list(): Promise<SusResponse[]>;
}

/** Ghi nhớ email nhắc hạn đã gửi (tránh gửi trùng). */
export interface ReminderLogRepository {
  sent(keys: string[]): Promise<Set<string>>;
  add(keys: string[]): Promise<void>;
}

export interface SupplementaryRepository {
  list(): Promise<SupplementaryRound[]>;
}

/** Hỏi đáp với sinh viên đang học (câu hỏi + câu trả lời, đều qua kiểm duyệt). */
export interface QaRepository {
  create(q: QaQuestion): Promise<QaQuestion>;
  update(id: string, fn: (q: QaQuestion) => QaQuestion): Promise<QaQuestion | null>;
  findById(id: string): Promise<QaQuestion | null>;
  listByProgram(programId: string): Promise<QaQuestion[]>;
  list(): Promise<QaQuestion[]>;
}

/** Lớp của giáo viên chủ nhiệm. */
export interface ClassRepository {
  create(c: TeacherClass): Promise<TeacherClass>;
  update(id: string, patch: Partial<Omit<TeacherClass, "id" | "teacherId">>): Promise<TeacherClass | null>;
  findById(id: string): Promise<TeacherClass | null>;
  findByCode(code: string): Promise<TeacherClass | null>;
  listByTeacher(teacherId: string): Promise<TeacherClass[]>;
  listByMember(userId: string): Promise<TeacherClass[]>;
  delete(id: string, teacherId: string): Promise<boolean>;
}

/** Xác minh danh tính giáo viên (quy trình kiểm duyệt). */
export interface TeacherVerificationRepository {
  create(v: TeacherVerification): Promise<TeacherVerification>;
  findById(id: string): Promise<TeacherVerification | null>;
  findByUserId(userId: string): Promise<TeacherVerification | null>;
  list(filter?: { status?: TeacherVerificationStatus }): Promise<TeacherVerification[]>;
  update(id: string, patch: Partial<TeacherVerification>): Promise<TeacherVerification | null>;
}

/** Khảo sát hài lòng sau 1 năm học. */
export interface OutcomeSurveyRepository {
  add(r: OutcomeSurvey): Promise<void>;
  listByProgram(programId: string): Promise<OutcomeSurvey[]>;
  findByUser(userId: string, programId: string): Promise<OutcomeSurvey | null>;
  list(): Promise<OutcomeSurvey[]>;
}


/** Quản trị danh mục (A02–A04): đọc cả bản ghi đang ẩn, thêm/sửa trường-ngành-chương trình. */
export interface CatalogAdminRepository {
  listSchools(): Promise<School[]>;
  saveSchool(school: School): Promise<void>;
  listMajors(): Promise<Major[]>;
  saveMajor(major: Major): Promise<void>;
  /** Toàn bộ chương trình (kể cả đang ẩn), đã áp phần ghi đè. */
  listPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | null>;
  createProgram(program: Program): Promise<void>;
}

export interface QuizConfigRepository {
  get(): Promise<QuizConfig | null>;
  save(cfg: QuizConfig): Promise<void>;
  /** Toàn bộ câu (kể cả đang ẩn) sau khi áp cấu hình. */
  listAll(): Promise<RiasecQuestion[]>;
}

export interface RecommendConfigRepository {
  get(): Promise<RecommendConfig | null>;
  save(cfg: RecommendConfig): Promise<void>;
}

export interface ImportBatchRepository {
  add(b: ImportBatch): Promise<void>;
  list(limit?: number): Promise<ImportBatch[]>;
}

export interface SchoolSubmissionRepository {
  add(s: SchoolSubmission): Promise<void>;
  list(filter?: { schoolId?: string; status?: SchoolSubmission["status"] }): Promise<SchoolSubmission[]>;
  findById(id: string): Promise<SchoolSubmission | null>;
  update(id: string, patch: Partial<SchoolSubmission>): Promise<SchoolSubmission | null>;
}
