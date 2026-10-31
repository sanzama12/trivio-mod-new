/**
 * MODEL LAYER — DATA TRANSFER OBJECTS (DTOs) & VIEW MODELS
 * Chứa các cấu trúc dữ liệu truyền tải giữa Service, Controller và View.
 * Độc lập với framework, UI rendering và database implementation.
 */

import type {
  AdmissionMethodKey,
  Combo,
  FitLevel,
  Major,
  MajorGroup,
  Program,
  School,
} from "../domain/types";
import type { ProgramFilters } from "../services/program.filters";

// ==========================================
// 1. CATALOG & EXPLORATION DTOs
// ==========================================

export interface MajorListItem {
  major: Major;
  group: MajorGroup;
  programCount: number;
  schoolCount: number;
}

export interface MajorGroupSummary {
  group: MajorGroup;
  majorCount: number;
  programCount: number;
  schoolCount: number;
}

export interface SchoolCompareItem {
  school: School;
  tuitionMin: number;
  tuitionMax: number;
  programCount: number;
  majors: { id: string; name: string; code: string; latestCutoff: number | null }[];
  methods: { name: string; tag: string }[];
  cutoffsByYear: { year: number; avgScore: number; minScore: number; maxScore: number; count: number }[];
  programs: {
    id: string;
    name: string;
    admissionCode: string;
    majorId: string;
    majorName: string;
    tuitionMin: number;
    tuitionMax: number;
    combos: string[];
    methods: { name: string; tag: string }[];
    cutoffs: { year: number; score: number }[];
  }[];
}

// ==========================================
// 2. PROGRAM & SEARCH DTOs
// ==========================================

export interface FitInfo {
  level: FitLevel;
  label: string;
  diff: number;
  hint: string;
}

export type FitResult =
  | { fit: FitInfo; reason: null }
  | { fit: null; reason: "combo" | "method" };

export interface ProgramView {
  program: Program;
  school: School;
  major: Major;
  latestCutoff: number | null;
  cutoffMethod: AdmissionMethodKey;
  cutoffCombo?: string;
  fit: FitInfo | null;
}

export interface SearchSuggestion {
  label: string;
  patch: Partial<ProgramFilters>;
  count: number;
}

export interface ProgramSearchResult {
  items: ProgramView[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  suggestions: SearchSuggestion[];
}

// ==========================================
// 3. RECOMMENDATION DTOs
// ==========================================

export interface MajorRecommendation {
  major: Major;
  group: MajorGroup;
  score: number;
  reasons: string[];
  knowledge: string;
  careerOrientation: string;
  schoolCount: number;
  programCount: number;
}

export interface MajorRecommendationFilter {
  groupIds?: string[];
  strongSubjectIds?: string[];
  interestMajorIds?: string[];
  limit?: number;
}

// ==========================================
// 4. SCORING & ADMISSION EVALUATION DTOs
// ==========================================

export interface TieBreakerCriteria {
  mainSubject?: string;
  minMainScore?: number;
  preferredWishOrder?: number;
}

export interface ComboRank {
  code: string;
  raw: number;
}
