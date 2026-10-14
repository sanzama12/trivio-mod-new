/**
 * Barrel CHỈ dùng ở server (page server component, route handler).
 * Client component import trực tiếp các module thuần: scoring.service, program.filters, password.rules.
 */
export { programService } from "./program.service";
export type { ProgramView, ProgramSearchResult, SearchSuggestion } from "./program.service";
export * from "./program.filters";
export { catalogService } from "./catalog.service";
export type { MajorListItem } from "./catalog.service";
export { riasecService, scoreAnswers, matchMajor, sanitizeRiasec, RIASEC_TYPES } from "./riasec.service";
export type { QuizAnswers } from "./riasec.service";
export { authService, MAX_LOGIN_ATTEMPTS } from "./auth.service";
export type { LoginResult, RegisterResult, GoogleProfile, ProfilePatch } from "./auth.service";
export { userDataService, mergeUserData, sanitizeUserData } from "./user-data.service";
export { buildGoogleAuthUrl, fetchGoogleProfile, isGoogleConfigured, GoogleOAuthError } from "./google-oauth.service";
export * from "./password.rules";
export * from "./scoring.service";
export { recommendationService, FOCUS_WEIGHTS } from "./recommendation.service";
export type { Recommendation, RecommendInput, RecommendFocus } from "./recommendation.service";
export { shareService, SHARE_DAYS, MAX_COMMENTS_PER_SHARE } from "./share.service";
export type { SharedView } from "./share.service";
export { timelineService } from "./timeline.service";
export { adminService, validateProgramEdit } from "./admin.service";
export type { ProgramEditInput } from "./admin.service";
