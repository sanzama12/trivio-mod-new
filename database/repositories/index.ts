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
  postgresImportBatchRepository,
  postgresNotificationRepository,
  postgresQaRepository,
  postgresRecommendConfigRepository,
  postgresReminderLogRepository,
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
import { postgresAdminDashboardRepository } from "./postgres-admin-dashboard";

import { postgresProgramAdminRepository } from "./postgres-program-admin";
import { postgresNewsRepository } from "./postgres-news";
import { postgresMaterialsRepository } from "./postgres-materials";

export const repositories = {
  materials: postgresMaterialsRepository,
  news: postgresNewsRepository,
  adminDashboard: postgresAdminDashboardRepository,
  schools: postgresSchoolRepository,
  majors: postgresMajorRepository,
  programs: postgresProgramRepository,
  quiz: postgresQuizRepository,
  catalog: postgresReferenceCatalogRepository,
  /** Quản trị danh mục */
  programAdmin: postgresProgramAdminRepository,
  catalogAdmin: postgresCatalogAdminRepository,
  recommendConfig: postgresRecommendConfigRepository,
  importBatches: postgresImportBatchRepository,
  schoolSubmissions: postgresSchoolSubmissionRepository,
  timeline: postgresTimelineRepository,
  users: postgresUserRepository,
  userData: postgresUserDataRepository,
  shares: postgresShareRepository,
  comments: postgresCommentRepository,
  audit: postgresAuditRepository,
  chatLogs: postgresChatLogRepository,
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
};

export type Repositories = typeof repositories;
export type {
  AuditRepository,
  CatalogRepository,
  ChatLogRepository,
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
