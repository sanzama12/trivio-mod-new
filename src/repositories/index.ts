/**
 * Điểm "cắm" repository duy nhất của ứng dụng (composition root cho lớp dữ liệu).
 * Thay implementation tại đây mà không phải sửa service hay UI.
 *
 * PostgreSQL là storage runtime duy nhất. Composition root không có fallback
 * filesystem/memory để lỗi cấu hình không bị che thành dữ liệu rỗng.
 */
import {
  postgresAnalyticsRepository,
  postgresAuditRepository,
  postgresChatAliasRepository,
  postgresChatLogRepository,
  postgresClassRepository,
  postgresCommentRepository,
  postgresDataReportRepository,
  postgresImportBatchRepository,
  postgresNotificationRepository,
  postgresOutcomeRepository,
  postgresOutcomeSurveyRepository,
  postgresProgramAdminRepository,
  postgresQaRepository,
  postgresQuizConfigRepository,
  postgresRecommendConfigRepository,
  postgresReminderLogRepository,
  postgresReviewRepository,
  postgresSchoolSubmissionRepository,
  postgresShareRepository,
  postgresSurveyRepository,
  postgresSupplementaryRepository,
  postgresTeacherVerificationRepository,
  postgresTimelineConfigRepository,
  postgresUserDataRepository,
} from "./postgres-documents";
import { postgresCatalogAdminRepository, postgresReferenceCatalogRepository, postgresTimelineRepository } from "./postgres-catalog";
import { postgresMajorRepository, postgresProgramRepository, postgresQuizRepository, postgresSchoolRepository, postgresUserRepository } from "./postgres";

export const repositories = {
  schools: postgresSchoolRepository,
  majors: postgresMajorRepository,
  programs: postgresProgramRepository,
  quiz: postgresQuizRepository,
  catalog: postgresReferenceCatalogRepository,
  /** Quản trị danh mục */
  programAdmin: postgresProgramAdminRepository,
  catalogAdmin: postgresCatalogAdminRepository,
  quizConfig: postgresQuizConfigRepository,
  recommendConfig: postgresRecommendConfigRepository,
  importBatches: postgresImportBatchRepository,
  schoolSubmissions: postgresSchoolSubmissionRepository,
  timeline: postgresTimelineRepository,
  users: postgresUserRepository,
  userData: postgresUserDataRepository,
  shares: postgresShareRepository,
  comments: postgresCommentRepository,
  audit: postgresAuditRepository,
  outcomes: postgresOutcomeRepository,
  reviews: postgresReviewRepository,
  chatLogs: postgresChatLogRepository,
  dataReports: postgresDataReportRepository,
  notifications: postgresNotificationRepository,
  timelineConfig: postgresTimelineConfigRepository,
  chatAliases: postgresChatAliasRepository,
  analytics: postgresAnalyticsRepository,
  surveys: postgresSurveyRepository,
  reminderLog: postgresReminderLogRepository,
  supplementary: postgresSupplementaryRepository,
  qa: postgresQaRepository,
  classes: postgresClassRepository,
  teacherVerifications: postgresTeacherVerificationRepository,
  outcomeSurveys: postgresOutcomeSurveyRepository,
};

export type Repositories = typeof repositories;
export type {
  AuditRepository,
  CatalogRepository,
  ChatLogRepository,
  OutcomeRepository,
  ReviewRepository,
  CommentRepository,
  MajorRepository,
  ProgramAdminRepository,
  ProgramRepository,
  QuizRepository,
  SchoolRepository,
  ShareRepository,
  TimelineRepository,
  UserDataRepository,
  UserRepository,
  TeacherVerificationRepository,
} from "./types";
