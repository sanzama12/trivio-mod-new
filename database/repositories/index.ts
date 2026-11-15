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
  postgresChatHistoryRepository,
  postgresCommentRepository,
  postgresImportBatchRepository,
  postgresNotificationRepository,
  postgresQaRepository,
  postgresShareRepository,
  postgresSurveyRepository,
  postgresSupplementaryRepository,
  postgresUserDataRepository,
} from "./postgres-documents";
import { postgresCatalogAdminRepository, postgresReferenceCatalogRepository } from "./postgres-catalog";
import { postgresMajorRepository, postgresProgramRepository, postgresSchoolRepository, postgresUserRepository } from "./postgres";
import { postgresAdminDashboardRepository } from "./postgres-admin-dashboard";

import { postgresProgramAdminRepository } from "./postgres-program-admin";
import { postgresDonationsRepository } from "./postgres-donations";
import {
  postgresAiSourceRepository,
  postgresInterestRepository,
  postgresMajorCareerRepository,
  postgresProgramYearRepository,
  postgresUsageRepository,
} from "./postgres-extras";

export const repositories = {
  donations: postgresDonationsRepository,
  aiSources: postgresAiSourceRepository,
  interests: postgresInterestRepository,
  majorCareers: postgresMajorCareerRepository,
  programYears: postgresProgramYearRepository,
  usage: postgresUsageRepository,
  adminDashboard: postgresAdminDashboardRepository,
  schools: postgresSchoolRepository,
  majors: postgresMajorRepository,
  programs: postgresProgramRepository,
  catalog: postgresReferenceCatalogRepository,
  /** Quản trị danh mục */
  programAdmin: postgresProgramAdminRepository,
  catalogAdmin: postgresCatalogAdminRepository,
  importBatches: postgresImportBatchRepository,
  users: postgresUserRepository,
  userData: postgresUserDataRepository,
  shares: postgresShareRepository,
  comments: postgresCommentRepository,
  audit: postgresAuditRepository,
  chatLogs: postgresChatLogRepository,
  chatHistory: postgresChatHistoryRepository,
  notifications: postgresNotificationRepository,
  chatAliases: postgresChatAliasRepository,
  analytics: postgresAnalyticsRepository,
  surveys: postgresSurveyRepository,
  supplementary: postgresSupplementaryRepository,
  qa: postgresQaRepository,
};

export type Repositories = typeof repositories;
export type { DonationRecord, DonationStats } from "./postgres-donations";
export type {
  AuditRepository,
  CatalogRepository,
  ChatLogRepository,
  ChatHistoryRepository,
  CommentRepository,
  MajorRepository,
  ProgramAdminRepository,
  ProgramRepository,
  SchoolRepository,
  ShareRepository,
  UserDataRepository,
  UserRepository,
} from "./types";
