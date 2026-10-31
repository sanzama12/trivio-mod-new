/**
 * =====================================================================
 * VIEW LAYER BARREL (MVC Architecture)
 * =====================================================================
 * Tập hợp các Presentational View Components của hệ thống TriOVO.
 *
 * Trong mô hình Clean MVC:
 * - Model:       src/models/ (Entities, DTOs, ViewModels)
 * - View:        src/views/ & src/components/ (Pure Presentational UI)
 * - Controller:  src/controllers/ (API Controllers) + Custom Hooks (Client Controllers)
 * - Service:     src/services/ (Pure Business & Domain Logic)
 * - Repository:  src/database/repositories/ (Direct Data Access)
 * =====================================================================
 */

// --- 1. Home & Navigation Views ---
export * from "../components/home/journey-steps";

// --- 2. Catalog & Major Views ---
export * from "../components/catalog/major-explorer";
export * from "../components/catalog/major-card";
export * from "../components/catalog/major-group-card";
export * from "../components/catalog/major-smart-suggester";
export * from "../components/catalog/use-major-smart-suggester";

// --- 3. School & Compare Views ---
export * from "../components/school/school-compare-view";
export * from "../components/school/use-school-compare";
export * from "../components/school/school-card";
export * from "../components/school/school-cutoff-chart";
export * from "../components/school/school-detail-view";
export * from "../components/school/school-logo";

// --- 4. Search & Filter Views ---
export * from "../components/search/filter-panel";
export * from "../components/search/mobile-filter-sheet";
export * from "../components/search/saved-score-hint";

// --- 5. Recommendation & Score Views ---
export * from "../components/score/score-wizard";
export * from "../components/recommend/why-drawer";

// --- 6. Wishlist & Planning Views ---
export * from "../components/wishlist/strategy-panel";
export * from "../components/wishlist/share-dialog";

// --- 7. Chat & Interaction Views ---
export * from "../components/chat/chat-widget";
