/**
 * REPOSITORY LAYER — hợp đồng truy cập dữ liệu.
 * Lớp service chỉ phụ thuộc vào các interface này. Muốn chuyển sang database (Prisma, Postgres…)
 * chỉ cần viết implementation mới và đổi trong `repositories/index.ts`.
 */
import type {
  ImportBatch,
  RecommendConfig,
  AppNotification,
  QaQuestion,
  ChatAlias,
  FunnelEvent,
  SusResponse,
  TimelineConfig,
  AuditEntry,
  ChatLog,
  Combo,
  FaqGroup,
  FinancialAidConfig,
  GuidanceProgram,
  Major,
  MajorGroup,
  Program,
  PlanningProgram,
  ProgramPatch,
  School,
  Share,
  ShareComment,
  Subject,
  SupplementaryRound,
  TimelineEvent,
  User,
  UserData,
} from "@/domain/types";

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
  findGuidancePrograms(majorId: string): Promise<GuidanceProgram[]>;
  findPlanningPrograms(): Promise<PlanningProgram[]>;
  findDiscoveryStats(): Promise<{
    programCountByMajor: Record<string, number>;
    programCountByGroup: Record<string, number>;
    schoolCountByGroup: Record<string, number>;
    totalPrograms: number;
    totalSchools: number;
  }>;
  findDiscoveryCatalog(): Promise<{
    groups: MajorGroup[];
    majors: Major[];
    schools: School[];
    stats: {
      programCountByMajor: Record<string, number>;
      programCountByGroup: Record<string, number>;
      schoolCountByGroup: Record<string, number>;
      totalPrograms: number;
      totalSchools: number;
    };
  }>;
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

/** Dữ liệu cá nhân đồng bộ theo tài khoản: đã lưu, nguyện vọng và hồ sơ điểm. */
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

/** Ghi trực tiếp bảng chương trình/bảng con, giữ bản gốc phục vụ reset + nhật ký thay đổi. */
export interface ProgramAdminRepository {
  /** Có bản gốc để khôi phục hay không. */
  hasEdits(programId: string): Promise<boolean>;
  listEditedIds(): Promise<string[]>;
  patchProgram(programId: string, patch: ProgramPatch | null, audit: AuditEntry): Promise<void>;
  /** Ghi các bản cập nhật và nhật ký tương ứng trong một transaction/query duy nhất. */
  patchProgramsBatch(entries: { programId: string; patch: ProgramPatch; audit: AuditEntry }[]): Promise<void>;
  listAudit(limit?: number): Promise<AuditEntry[]>;
}

export interface TimelineRepository {
  findAll(): Promise<TimelineEvent[]>;
}

/** Nhật ký thay đổi dùng chung cho dữ liệu và nội dung quản trị. */
export interface AuditRepository {
  append(entry: AuditEntry): Promise<void>;
  list(limit?: number, filter?: { targetType?: AuditEntry["targetType"]; targetId?: string }): Promise<AuditEntry[]>;
}

export interface ChatLogRepository {
  add(log: ChatLog): Promise<void>;
  setHelpful(id: string, helpful: boolean): Promise<boolean>;
  list(limit?: number): Promise<ChatLog[]>;
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


/** Xác minh danh tính giáo viên (quy trình kiểm duyệt). */
/** Quản trị danh mục (A02–A04): đọc cả bản ghi đang ẩn, thêm/sửa trường-ngành-chương trình. */
export interface CatalogAdminRepository {
  listSchools(): Promise<School[]>;
  saveSchool(school: School): Promise<void>;
  saveSchoolsBatch(schools: School[]): Promise<void>;
  listMajors(): Promise<Major[]>;
  saveMajor(major: Major): Promise<void>;
  saveMajorsBatch(majors: Major[]): Promise<void>;
  /** Toàn bộ chương trình (kể cả đang ẩn), đã áp phần ghi đè. */
  listPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | null>;
  createProgram(program: Program): Promise<void>;
  createProgramsBatch(programs: Program[]): Promise<void>;
}

export interface RecommendConfigRepository {
  get(): Promise<RecommendConfig | null>;
  save(cfg: RecommendConfig): Promise<void>;
}

export interface ImportBatchRepository {
  add(b: ImportBatch): Promise<void>;
  list(limit?: number): Promise<ImportBatch[]>;
}
