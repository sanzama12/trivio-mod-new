import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const JSON_PATH = join(ROOT, "database", "ts247_parsed_data.json");
const rawData = readFileSync(JSON_PATH, "utf8");
const schools = JSON.parse(rawData);

// Compute statistics
const totalSchools = schools.length;
const schoolsWithData = schools.filter((s: any) => s.methods.length > 0).length;
const totalCutoffs = schools.reduce((sum: number, s: any) => sum + s.total_cutoffs, 0);

// Unique combos across all cutoffs
const combosSet = new Set<string>();
schools.forEach((s: any) => {
  s.methods.forEach((m: any) => {
    m.cutoffs.forEach((c: any) => {
      if (c.block) {
        c.block.split(/[;,]/).forEach((b: string) => {
          const trimmed = b.trim();
          if (trimmed && trimmed.length <= 5 && /^[A-Za-z0-9]+$/.test(trimmed)) {
            combosSet.add(trimmed.toUpperCase());
          }
        });
      }
    });
  });
});
const popularCombos = ["A00", "A01", "B00", "C00", "C01", "D01", "D07", "D08", "A02", "B08", "K00", "Q00"];

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hệ Thống Tra Cứu Tuyển Sinh & Điểm Chuẩn Toàn Quốc (Tuyensinh247)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --bg-alt: #0d1322;
      --surface: #121929;
      --surface-card: #172238;
      --surface-hover: #1e2c47;
      --surface-active: #243555;
      --border: #22324d;
      --border-focus: #3b82f6;
      --border-light: rgba(255, 255, 255, 0.07);
      
      --text: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-muted: #8292ab;
      --text-dim: #546580;
      
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --primary-glow: rgba(59, 130, 246, 0.25);
      --primary-subtle: rgba(59, 130, 246, 0.12);
      
      --emerald: #10b981;
      --emerald-subtle: rgba(16, 185, 129, 0.12);
      --amber: #f59e0b;
      --amber-subtle: rgba(245, 158, 11, 0.12);
      --purple: #8b5cf6;
      --purple-subtle: rgba(139, 92, 246, 0.12);
      --rose: #f43f5e;
      --rose-subtle: rgba(244, 63, 94, 0.12);
      --cyan: #06b6d4;
      --cyan-subtle: rgba(6, 182, 212, 0.12);
      
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
      --shadow-md: 0 6px 20px rgba(0,0,0,0.4);
      --shadow-lg: 0 12px 36px rgba(0,0,0,0.5);
      
      --font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* TOP HEADER */
    header {
      background: linear-gradient(180deg, #131c31 0%, #0c1220 100%);
      border-bottom: 1px solid var(--border);
      padding: 16px 28px;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(16px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand-area {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }
    .brand-title h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.4px;
      background: linear-gradient(120deg, #ffffff 30%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-title p {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      background: var(--emerald-subtle);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.25);
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-live::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.8; }
    }

    /* TOP STATS */
    .stats-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .stat-pill {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .stat-pill .num {
      font-family: var(--mono);
      font-size: 15px;
      font-weight: 700;
      color: #60a5fa;
    }
    .stat-pill .lbl {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    /* VIEW SWITCHER TABS */
    .view-switcher {
      display: flex;
      background: rgba(18, 25, 41, 0.8);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 3px;
      gap: 4px;
    }
    .switch-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .switch-btn:hover {
      color: var(--text);
      background: var(--surface-hover);
    }
    .switch-btn.active {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
    }

    /* TOOLBAR & CONTROLS */
    .controls-bar {
      background: var(--bg-alt);
      border-bottom: 1px solid var(--border);
      padding: 12px 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .search-row {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .main-search-wrap {
      flex: 1;
      min-width: 320px;
      position: relative;
    }
    .main-search-wrap input {
      width: 100%;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 11px 16px 11px 44px;
      color: #fff;
      font-size: 14px;
      font-family: var(--font);
      outline: none;
      transition: all 0.2s;
    }
    .main-search-wrap input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
      background: var(--surface-card);
    }
    .main-search-wrap .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: var(--text-muted);
      pointer-events: none;
    }
    .main-search-wrap .kbd-hint {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 7px;
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .filter-group {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .select-filter {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 13px;
      font-family: var(--font);
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .select-filter:focus {
      border-color: var(--primary);
    }

    .score-range-box {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 5px 10px;
    }
    .score-range-box span {
      font-size: 12px;
      color: var(--text-muted);
    }
    .score-range-box input {
      width: 55px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: #fff;
      font-family: var(--mono);
      font-size: 13px;
      padding: 4px 6px;
      text-align: center;
      outline: none;
    }
    .score-range-box input:focus {
      border-color: var(--primary);
    }

    .btn-action {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: var(--surface-hover);
      color: #fff;
      border-color: #3b5075;
    }
    .btn-primary {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
    }

    /* METHOD PILLS BAR */
    .method-pills-bar {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: thin;
    }
    .method-pill {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .method-pill:hover {
      background: var(--surface-hover);
      color: #fff;
    }
    .method-pill.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
    }
    .method-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* MAIN WORKSPACE */
    .main-workspace {
      display: flex;
      flex: 1;
      height: calc(100vh - 170px);
      overflow: hidden;
      position: relative;
    }

    /* SIDEBAR SCHOOL EXPLORER */
    .sidebar-schools {
      width: 390px;
      border-right: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width 0.3s;
    }

    /* Alphabet bar */
    .alpha-bar {
      display: flex;
      overflow-x: auto;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      padding: 6px 8px;
      gap: 3px;
      scrollbar-width: none;
    }
    .alpha-bar::-webkit-scrollbar { display: none; }
    .alpha-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .alpha-btn:hover, .alpha-btn.active {
      background: var(--primary);
      color: #fff;
    }

    .sidebar-header-status {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      background: rgba(18, 25, 41, 0.4);
    }

    .school-items-container {
      flex: 1;
      overflow-y: auto;
      list-style: none;
    }

    .school-card {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-light);
      cursor: pointer;
      transition: all 0.15s;
      position: relative;
    }
    .school-card:hover {
      background: var(--surface-card);
    }
    .school-card.active {
      background: #172642;
      border-left: 4px solid var(--primary);
    }
    .school-card.active .school-name-text {
      color: #93c5fd;
    }

    .school-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .school-code-tag {
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 700;
      color: #60a5fa;
      background: var(--primary-subtle);
      border: 1px solid rgba(96, 165, 250, 0.25);
      border-radius: 6px;
      padding: 2px 8px;
    }
    .school-stat-badge {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      gap: 8px;
    }

    .school-name-text {
      font-size: 13.5px;
      font-weight: 600;
      color: #f1f5f9;
      line-height: 1.45;
    }

    .school-tags-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .micro-tag {
      font-size: 10.5px;
      font-weight: 500;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      border-radius: 4px;
      padding: 2px 6px;
    }

    /* RIGHT DETAIL AREA */
    .detail-container {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* SCHOOL HERO BANNER */
    .school-hero {
      background: linear-gradient(135deg, #162238 0%, #111a2d 100%);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }
    .school-hero::before {
      content: '';
      position: absolute;
      right: -30px;
      top: -30px;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    .hero-title-group h2 {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
      line-height: 1.3;
      margin: 8px 0 6px 0;
    }
    .hero-sub {
      color: var(--text-muted);
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .hero-kpis {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .kpi-card {
      background: rgba(10, 15, 26, 0.6);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      min-width: 110px;
      text-align: center;
    }
    .kpi-val {
      font-family: var(--mono);
      font-size: 18px;
      font-weight: 800;
      color: #38bdf8;
    }
    .kpi-val.highlight-rose { color: #f43f5e; }
    .kpi-val.highlight-emerald { color: #34d399; }
    .kpi-lbl {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* METHOD CARD SECTION */
    .method-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }
    .method-section-header {
      background: linear-gradient(90deg, #162238 0%, #121b2d 100%);
      border-bottom: 1px solid var(--border);
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .method-badge-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .tag-year {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      background: var(--emerald-subtle);
      border: 1px solid rgba(52, 211, 153, 0.3);
      color: #34d399;
      border-radius: 6px;
    }
    .method-stats-tag {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* DATA TABLE */
    .table-container {
      overflow-x: auto;
      max-height: 540px;
      position: relative;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    thead th {
      background: #0f1626;
      color: var(--text-muted);
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    tbody tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.15s;
    }
    tbody tr:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    td {
      padding: 12px 18px;
      color: #e2e8f0;
      vertical-align: middle;
    }

    .col-code {
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 700;
      color: #93c5fd;
      white-space: nowrap;
    }
    .col-name {
      font-weight: 600;
      color: #f8fafc;
      font-size: 13.5px;
      line-height: 1.4;
    }
    .col-combos {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-width: 280px;
    }
    .combo-badge {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .combo-badge.highlight {
      background: var(--primary-subtle);
      border-color: var(--primary);
      color: #93c5fd;
    }
    .score-badge {
      font-family: var(--mono);
      font-size: 16px;
      font-weight: 800;
      color: #38bdf8;
      display: inline-block;
    }
    .score-badge.high { color: #f43f5e; }
    .score-badge.mid { color: #fbbf24; }
    .score-badge.scale-high {
      /* for TSA (thang 100) or HSA (thang 150) or HCM (thang 1200) */
      color: #c084fc;
    }
    .col-quota {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--text-muted);
    }
    .col-note {
      font-size: 12px;
      color: var(--text-muted);
      max-width: 220px;
      line-height: 1.35;
    }

    /* GLOBAL MAJOR SEARCH VIEW */
    .global-view {
      display: none;
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
      flex-direction: column;
      gap: 20px;
    }
    .global-view.active {
      display: flex;
    }

    .results-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* EMPTY STATE */
    .empty-state {
      margin: auto;
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
    .empty-state .icon {
      font-size: 54px;
      margin-bottom: 16px;
      opacity: 0.8;
    }
    .empty-state h3 {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    .empty-state p {
      font-size: 14px;
      max-width: 440px;
      margin: 0 auto;
      line-height: 1.5;
    }

    /* PAGINATION BAR */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: var(--surface);
      border-top: 1px solid var(--border);
    }
    .pagination-controls {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .page-btn {
      background: var(--surface-card);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .page-btn:hover:not(:disabled) {
      background: var(--primary);
      color: #fff;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* SCROLLBAR */
    ::-webkit-scrollbar { width: 7px; height: 7px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: #263854; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

    /* TOAST ALERT */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      border: 1px solid var(--primary);
      color: #fff;
      padding: 12px 20px;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lg);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 1000;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    @media (max-width: 1024px) {
      .main-workspace { flex-direction: column; height: auto; }
      .sidebar-schools { width: 100%; height: 380px; }
      .detail-container, .global-view { padding: 16px; }
      header { padding: 12px 16px; }
      .controls-bar { padding: 12px 16px; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header>
    <div class="header-content">
      <div class="brand-area">
        <div class="brand-logo">🎓</div>
        <div class="brand-title">
          <h1>Tra Cứu Tuyển Sinh & Điểm Chuẩn Toàn Quốc</h1>
          <p>
            <span>Dữ liệu gốc Tuyensinh247</span>
            <span>•</span>
            <span class="badge-live">300 Trường ĐH / HV</span>
          </p>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-pill">
          <span class="num">${totalSchools}</span>
          <span class="lbl">Trường</span>
        </div>
        <div class="stat-pill">
          <span class="num">${totalCutoffs.toLocaleString()}</span>
          <span class="lbl">Bản ghi điểm</span>
        </div>
        <div class="stat-pill">
          <span class="num">8+</span>
          <span class="lbl">Phương thức</span>
        </div>
      </div>

      <!-- VIEW MODE SWITCHER -->
      <div class="view-switcher">
        <button class="switch-btn active" id="btnModeSchool" onclick="switchViewMode('school')">
          <span>🏛️ Theo Trường</span>
        </button>
        <button class="switch-btn" id="btnModeGlobal" onclick="switchViewMode('global')">
          <span>🔍 Tra Ngành Toàn Quốc</span>
        </button>
      </div>
    </div>
  </header>

  <!-- CONTROLS & FILTER BAR -->
  <div class="controls-bar">
    <div class="search-row">
      <div class="main-search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="globalSearchInput" placeholder="Tìm nhanh: Mã trường (BKA, FTU...), Tên trường, Ngành đào tạo (CNTT, Y khoa, Kinh tế...)..." autocomplete="off">
        <span class="kbd-hint">/</span>
      </div>

      <div class="filter-group">
        <!-- Combo filter -->
        <select class="select-filter" id="comboFilter" title="Lọc theo khối / tổ hợp môn">
          <option value="all">Tất cả tổ hợp môn</option>
          ${popularCombos.map((c) => `<option value="${c}">Khối ${c}</option>`).join("")}
        </select>

        <!-- Score range -->
        <div class="score-range-box" title="Lọc khoảng điểm chuẩn">
          <span>Điểm:</span>
          <input type="number" id="minScore" placeholder="Min" step="0.5" min="0" max="1200">
          <span>-</span>
          <input type="number" id="maxScore" placeholder="Max" step="0.5" min="0" max="1200">
        </div>

        <!-- Sort -->
        <select class="select-filter" id="sortFilter" title="Sắp xếp kết quả">
          <option value="default">Sắp xếp mặc định</option>
          <option value="score-desc">Điểm chuẩn: Cao → Thấp</option>
          <option value="score-asc">Điểm chuẩn: Thấp → Cao</option>
          <option value="name-asc">Tên ngành: A → Z</option>
        </select>

        <!-- Export CSV Button -->
        <button class="btn-action" onclick="exportCurrentViewCSV()" title="Xuất dữ liệu đang hiển thị ra file CSV">
          <span>📥 Xuất CSV</span>
        </button>
      </div>
    </div>

    <!-- METHOD PILLS -->
    <div class="method-pills-bar" id="methodPillsBar">
      <button class="method-pill active" data-method="all"><span class="dot"></span>Tất cả phương thức</button>
      <button class="method-pill" data-method="thpt"><span class="dot" style="color: #60a5fa;"></span>Thi THPT</button>
      <button class="method-pill" data-method="hoc-ba"><span class="dot" style="color: #34d399;"></span>Học bạ</button>
      <button class="method-pill" data-method="dgnl"><span class="dot" style="color: #f59e0b;"></span>ĐGNL (HSA / V-ACT)</button>
      <button class="method-pill" data-method="dgtd"><span class="dot" style="color: #a855f7;"></span>ĐGTD TSA</button>
      <button class="method-pill" data-method="ket-hop"><span class="dot" style="color: #f43f5e;"></span>Xét tuyển kết hợp</button>
      <button class="method-pill" data-method="quoc-te"><span class="dot" style="color: #06b6d4;"></span>Chứng chỉ quốc tế</button>
      <button class="method-pill" data-method="khac"><span class="dot" style="color: #94a3b8;"></span>Khác / Tuyển thẳng</button>
    </div>
  </div>

  <!-- WORKSPACE -->
  <div class="main-workspace">

    <!-- MODE 1: SCHOOL EXPLORER VIEW -->
    <aside class="sidebar-schools" id="schoolSidebar">
      <!-- Alphabet Quick Jump -->
      <div class="alpha-bar" id="alphaBar"></div>

      <div class="sidebar-header-status">
        <span id="schoolCountDisplay">Đang tải...</span>
        <span>Mã trường A-Z</span>
      </div>

      <ul class="school-items-container" id="schoolListItems"></ul>
    </aside>

    <main class="detail-container" id="schoolDetailView">
      <!-- Dynamic school hero & tables -->
    </main>

    <!-- MODE 2: GLOBAL MAJOR SEARCH VIEW -->
    <main class="global-view" id="globalResultsView">
      <div class="results-meta-bar">
        <span id="globalCountSummary">Nhập từ khóa ngành hoặc bấm lọc để tìm kiếm trên 27,879 bản ghi</span>
        <span id="globalPageInfo">Trang 1</span>
      </div>

      <div class="method-section" style="flex: 1; display: flex; flex-direction: column;">
        <div class="table-container" style="max-height: none; flex: 1;">
          <table>
            <thead>
              <tr>
                <th style="width: 110px;">Mã trường</th>
                <th style="width: 240px;">Tên trường</th>
                <th style="width: 100px;">Mã ngành</th>
                <th>Tên ngành / Chương trình</th>
                <th style="width: 170px;">Phương thức</th>
                <th style="width: 140px;">Tổ hợp môn</th>
                <th style="width: 100px;">Điểm chuẩn</th>
                <th style="width: 70px;">Chỉ tiêu</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody id="globalTableBody"></tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <span id="paginationText" style="font-size: 12px; color: var(--text-muted);">Hiển thị 0 / 0 bản ghi</span>
          <div class="pagination-controls">
            <button class="page-btn" id="prevPageBtn" onclick="changeGlobalPage(-1)">← Trang trước</button>
            <span id="currPageLabel" style="font-size: 12px; font-weight: 700; color: #fff; padding: 0 8px;">1</span>
            <button class="page-btn" id="nextPageBtn" onclick="changeGlobalPage(1)">Trang sau →</button>
          </div>
        </div>
      </div>
    </main>

  </div>

  <!-- TOAST NOTIFICATION -->
  <div class="toast" id="toastBox">
    <span id="toastIcon">✅</span>
    <span id="toastMsg">Đã sao chép vào bộ nhớ tạm!</span>
  </div>

  <script>
    // Embedded dataset
    const DATA = ${rawData};

    // State
    let currentViewMode = 'school'; // 'school' | 'global'
    let selectedSchoolCode = 'BKA';
    let activeMethodFilter = 'all';
    let searchQuery = '';
    let selectedCombo = 'all';
    let minScoreVal = null;
    let maxScoreVal = null;
    let currentSort = 'default';

    // Global View Pagination State
    let globalPage = 1;
    const GLOBAL_PAGE_SIZE = 50;
    let cachedGlobalRows = [];

    // DOM Elements
    const globalSearchInput = document.getElementById('globalSearchInput');
    const comboFilter = document.getElementById('comboFilter');
    const minScoreInput = document.getElementById('minScore');
    const maxScoreInput = document.getElementById('maxScore');
    const sortFilter = document.getElementById('sortFilter');
    const methodPillsBar = document.getElementById('methodPillsBar');
    const alphaBar = document.getElementById('alphaBar');
    const schoolListItems = document.getElementById('schoolListItems');
    const schoolCountDisplay = document.getElementById('schoolCountDisplay');
    const schoolDetailView = document.getElementById('schoolDetailView');
    const schoolSidebar = document.getElementById('schoolSidebar');
    const globalResultsView = document.getElementById('globalResultsView');
    const globalTableBody = document.getElementById('globalTableBody');
    const globalCountSummary = document.getElementById('globalCountSummary');
    const paginationText = document.getElementById('paginationText');
    const currPageLabel = document.getElementById('currPageLabel');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const btnModeSchool = document.getElementById('btnModeSchool');
    const btnModeGlobal = document.getElementById('btnModeGlobal');
    const toastBox = document.getElementById('toastBox');

    // Init Alphabet bar
    function initAlphabetBar() {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWYZ'.split('');
      alphaBar.innerHTML = '<button class="alpha-btn active" data-alpha="all">ALL</button>';
      letters.forEach(char => {
        alphaBar.innerHTML += \`<button class="alpha-btn" data-alpha="\${char}">\${char}</button>\`;
      });

      alphaBar.querySelectorAll('.alpha-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          alphaBar.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const alpha = btn.dataset.alpha;
          if (alpha === 'all') {
            searchQuery = '';
          } else {
            searchQuery = '^' + alpha;
          }
          globalSearchInput.value = alpha === 'all' ? '' : alpha;
          onFiltersChanged();
        });
      });
    }

    // Switch view mode
    function switchViewMode(mode) {
      currentViewMode = mode;
      if (mode === 'school') {
        btnModeSchool.classList.add('active');
        btnModeGlobal.classList.remove('active');
        schoolSidebar.style.display = 'flex';
        schoolDetailView.style.display = 'flex';
        globalResultsView.classList.remove('active');
        renderSchoolSidebar();
        renderSchoolDetail();
      } else {
        btnModeSchool.classList.remove('active');
        btnModeGlobal.classList.add('active');
        schoolSidebar.style.display = 'none';
        schoolDetailView.style.display = 'none';
        globalResultsView.classList.add('active');
        renderGlobalResults();
      }
    }

    // Filter matching logic
    function matchMethod(methodName, methodAlias) {
      if (activeMethodFilter === 'all') return true;
      const n = (methodName || '').toLowerCase();
      const a = (methodAlias || '').toLowerCase();
      if (activeMethodFilter === 'thpt') return a.includes('thpt') || n.includes('thpt');
      if (activeMethodFilter === 'hoc-ba') return a.includes('hoc-ba') || n.includes('học bạ');
      if (activeMethodFilter === 'dgnl') return a.includes('dgnl') || a.includes('hsa') || a.includes('v-act') || n.includes('đgnl');
      if (activeMethodFilter === 'dgtd') return a.includes('dgtd') || a.includes('tsa') || n.includes('đgtd');
      if (activeMethodFilter === 'ket-hop') return a.includes('ket-hop') || n.includes('kết hợp');
      if (activeMethodFilter === 'quoc-te') return a.includes('quoc-te') || n.includes('quốc tế');
      if (activeMethodFilter === 'khac') return a.includes('khac') || n.includes('khác') || n.includes('thẳng');
      return true;
    }

    function matchCombo(cutoffBlock) {
      if (selectedCombo === 'all') return true;
      if (!cutoffBlock) return false;
      const blocks = cutoffBlock.split(/[;,]/).map(b => b.trim().toUpperCase());
      return blocks.includes(selectedCombo);
    }

    function matchScore(mark) {
      if (mark === null || mark === undefined) {
        // If filtering by score, rows with no score fail
        return minScoreVal === null && maxScoreVal === null;
      }
      if (minScoreVal !== null && mark < minScoreVal) return false;
      if (maxScoreVal !== null && mark > maxScoreVal) return false;
      return true;
    }

    // Filter schools for Sidebar
    function getFilteredSchools() {
      const q = searchQuery.toLowerCase().trim();
      const isAlphaPrefix = q.startsWith('^');
      const prefix = isAlphaPrefix ? q.slice(1) : '';

      return DATA.filter(s => {
        if (isAlphaPrefix) {
          if (!s.school_code.toLowerCase().startsWith(prefix)) return false;
        } else if (q) {
          const mCode = s.school_code.toLowerCase().includes(q);
          const mName = s.school_name.toLowerCase().includes(q);
          const mMajor = s.methods.some(m => 
            m.cutoffs.some(c => c.major_name.toLowerCase().includes(q) || c.major_code.toLowerCase().includes(q))
          );
          if (!mCode && !mName && !mMajor) return false;
        }

        // Method filter check
        if (activeMethodFilter !== 'all') {
          const hasMethod = s.methods.some(m => matchMethod(m.method_name, m.method_alias));
          if (!hasMethod) return false;
        }

        return true;
      });
    }

    // Render Sidebar List
    function renderSchoolSidebar() {
      const schools = getFilteredSchools();
      schoolCountDisplay.textContent = \`\${schools.length} / \${DATA.length} trường\`;
      schoolListItems.innerHTML = '';

      if (schools.length === 0) {
        schoolListItems.innerHTML = '<li style="padding: 30px 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Không tìm thấy trường phù hợp với bộ lọc hiện tại.</li>';
        return;
      }

      schools.forEach(s => {
        const li = document.createElement('li');
        li.className = 'school-card' + (s.school_code === selectedSchoolCode ? ' active' : '');
        li.onclick = () => {
          selectedSchoolCode = s.school_code;
          renderSchoolSidebar();
          renderSchoolDetail();
        };

        li.innerHTML = \`
          <div class="school-top-row">
            <span class="school-code-tag">\${s.school_code}</span>
            <div class="school-stat-badge">
              <span>📚 \${s.unique_majors_count} ngành</span>
              <span>🎯 \${s.methods.length} PT</span>
            </div>
          </div>
          <div class="school-name-text">\${s.school_name}</div>
          <div class="school-tags-row">
            <span class="micro-tag">📊 \${s.total_cutoffs} điểm</span>
            \${s.methods.slice(0, 2).map(m => \`<span class="micro-tag">\${m.method_name}</span>\`).join('')}
          </div>
        \`;
        schoolListItems.appendChild(li);
      });
    }

    // Render Selected School Detail
    function renderSchoolDetail() {
      const school = DATA.find(s => s.school_code === selectedSchoolCode);
      if (!school) {
        schoolDetailView.innerHTML = \`
          <div class="empty-state">
            <div class="icon">🏛️</div>
            <h3>Chọn một trường để xem chi tiết</h3>
            <p>Chọn từ danh sách bên trái hoặc nhập mã trường vào ô tìm kiếm ở trên.</p>
          </div>
        \`;
        return;
      }

      // Filter methods
      let filteredMethods = school.methods.filter(m => matchMethod(m.method_name, m.method_alias));

      // Calculate school stats
      let allMarks = [];
      school.methods.forEach(m => {
        m.cutoffs.forEach(c => {
          if (c.mark !== null && c.mark > 0) allMarks.push(c.mark);
        });
      });
      const minScore = allMarks.length ? Math.min(...allMarks) : null;
      const maxScore = allMarks.length ? Math.max(...allMarks) : null;
      const avgScore = allMarks.length ? (allMarks.reduce((a, b) => a + b, 0) / allMarks.length).toFixed(2) : null;

      let html = \`
        <div class="school-hero">
          <div class="hero-top">
            <div class="hero-title-group">
              <span class="school-code-tag" style="font-size: 14px; padding: 4px 12px;">MÃ TRƯỜNG: \${school.school_code}</span>
              <h2>\${school.school_name}</h2>
              <div class="hero-sub">
                <span>📁 Nguồn: \${school.file_name}</span>
                <span>•</span>
                <span>📚 \${school.unique_majors_count} Ngành/CTĐT</span>
                <span>•</span>
                <span>🎯 \${school.methods.length} Phương thức tuyển sinh</span>
              </div>
            </div>
            <div class="hero-kpis">
              <div class="kpi-card">
                <div class="kpi-val highlight-rose">\${maxScore ?? '-'}</div>
                <div class="kpi-lbl">Điểm cao nhất</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val highlight-emerald">\${minScore ?? '-'}</div>
                <div class="kpi-lbl">Điểm thấp nhất</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">\${avgScore ?? '-'}</div>
                <div class="kpi-lbl">Điểm trung bình</div>
              </div>
            </div>
          </div>
        </div>
      \`;

      if (filteredMethods.length === 0) {
        html += \`
          <div class="empty-state">
            <div class="icon">🔍</div>
            <h3>Không có dữ liệu cho phương thức đã chọn</h3>
            <p>Trường \${school.school_name} không có bản ghi điểm nào thuộc phương thức này. Vui lòng chọn "Tất cả phương thức" để xem toàn bộ.</p>
          </div>
        \`;
      } else {
        filteredMethods.forEach(m => {
          // Filter cutoffs by combo, score, and search query
          let filteredCutoffs = m.cutoffs.filter(c => {
            if (!matchCombo(c.block)) return false;
            if (!matchScore(c.mark)) return false;
            if (searchQuery && !searchQuery.startsWith('^')) {
              const q = searchQuery.toLowerCase();
              const matchMajor = c.major_name.toLowerCase().includes(q) || c.major_code.toLowerCase().includes(q);
              const matchBlock = c.block ? c.block.toLowerCase().includes(q) : false;
              if (!matchMajor && !matchBlock) return false;
            }
            return true;
          });

          // Sort cutoffs
          if (currentSort === 'score-desc') {
            filteredCutoffs.sort((a, b) => (b.mark ?? -1) - (a.mark ?? -1));
          } else if (currentSort === 'score-asc') {
            filteredCutoffs.sort((a, b) => (a.mark ?? 9999) - (b.mark ?? 9999));
          } else if (currentSort === 'name-asc') {
            filteredCutoffs.sort((a, b) => a.major_name.localeCompare(b.major_name));
          }

          html += \`
            <div class="method-section">
              <div class="method-section-header">
                <div class="method-badge-title">
                  <span>📌 \${m.method_name}</span>
                  <span class="tag-year">NĂM \${m.year}</span>
                </div>
                <div class="method-stats-tag">
                  Hiển thị \${filteredCutoffs.length} / \${m.cutoffs.length} ngành
                </div>
              </div>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 120px;">Mã ngành</th>
                      <th>Tên ngành / Chương trình</th>
                      <th style="width: 240px;">Tổ hợp môn</th>
                      <th style="width: 120px;">Điểm chuẩn</th>
                      <th style="width: 80px;">Chỉ tiêu</th>
                      <th>Ghi chú / Tiêu chí phụ</th>
                    </tr>
                  </thead>
                  <tbody>
          \`;

          if (filteredCutoffs.length === 0) {
            html += \`
              <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
                  Không có ngành nào khớp với bộ lọc điểm/tổ hợp môn hiện tại.
                </td>
              </tr>
            \`;
          } else {
            filteredCutoffs.forEach(c => {
              const blocks = c.block ? c.block.split(/[;,]/).map(b => b.trim()).filter(Boolean) : [];
              const blockHtml = blocks.length > 0 
                ? \`<div class="col-combos">\${blocks.map(b => \`<span class="combo-badge \${b === selectedCombo ? 'highlight' : ''}">\${b}</span>\`).join('')}</div>\`
                : '<span style="color: var(--text-dim); font-size: 11px;">Xét theo PT</span>';

              const markVal = c.mark !== null ? c.mark : '-';
              let markClass = 'score-badge';
              if (c.mark !== null) {
                if (c.mark >= 27 && c.mark <= 30) markClass += ' high';
                else if (c.mark >= 24 && c.mark < 27) markClass += ' mid';
                else if (c.mark > 30) markClass += ' scale-high'; // thang 100/150/1200
              }

              const quotaVal = c.quota !== null ? c.quota : '-';
              const noteVal = c.note || (c.sub_criteria && c.sub_criteria.length ? c.sub_criteria.join('; ') : '-');

              html += \`
                <tr>
                  <td class="col-code">\${c.major_code || '-'}</td>
                  <td class="col-name">\${c.major_name}</td>
                  <td>\${blockHtml}</td>
                  <td><span class="\${markClass}">\${markVal}</span></td>
                  <td class="col-quota">\${quotaVal}</td>
                  <td class="col-note">\${noteVal}</td>
                </tr>
              \`;
            });
          }

          html += \`
                  </tbody>
                </table>
              </div>
            </div>
          \`;
        });
      }

      schoolDetailView.innerHTML = html;
      schoolDetailView.scrollTop = 0;
    }

    // MODE 2: Global Search Rendering
    function getGlobalRows() {
      const q = searchQuery.toLowerCase().trim();
      const rows = [];

      DATA.forEach(school => {
        school.methods.forEach(method => {
          if (!matchMethod(method.method_name, method.method_alias)) return;

          method.cutoffs.forEach(c => {
            if (!matchCombo(c.block)) return false;
            if (!matchScore(c.mark)) return false;

            if (q) {
              const matchSchoolCode = school.school_code.toLowerCase().includes(q);
              const matchSchoolName = school.school_name.toLowerCase().includes(q);
              const matchMajorName = c.major_name.toLowerCase().includes(q);
              const matchMajorCode = c.major_code.toLowerCase().includes(q);
              const matchBlock = c.block ? c.block.toLowerCase().includes(q) : false;

              if (!matchSchoolCode && !matchSchoolName && !matchMajorName && !matchMajorCode && !matchBlock) {
                return;
              }
            }

            rows.push({
              school_code: school.school_code,
              school_name: school.school_name,
              method_name: method.method_name,
              year: method.year,
              major_code: c.major_code,
              major_name: c.major_name,
              block: c.block,
              mark: c.mark,
              quota: c.quota,
              note: c.note || (c.sub_criteria ? c.sub_criteria.join('; ') : ''),
            });
          });
        });
      });

      // Sort
      if (currentSort === 'score-desc') {
        rows.sort((a, b) => (b.mark ?? -1) - (a.mark ?? -1));
      } else if (currentSort === 'score-asc') {
        rows.sort((a, b) => (a.mark ?? 9999) - (b.mark ?? 9999));
      } else if (currentSort === 'name-asc') {
        rows.sort((a, b) => a.major_name.localeCompare(b.major_name));
      }

      return rows;
    }

    function renderGlobalResults() {
      cachedGlobalRows = getGlobalRows();
      globalPage = 1;
      updateGlobalPage();
    }

    function updateGlobalPage() {
      const total = cachedGlobalRows.length;
      const totalPages = Math.ceil(total / GLOBAL_PAGE_SIZE) || 1;
      if (globalPage > totalPages) globalPage = totalPages;
      if (globalPage < 1) globalPage = 1;

      const start = (globalPage - 1) * GLOBAL_PAGE_SIZE;
      const end = Math.min(start + GLOBAL_PAGE_SIZE, total);
      const pageRows = cachedGlobalRows.slice(start, end);

      globalCountSummary.textContent = \`Tìm thấy \${total.toLocaleString()} bản ghi điểm trên toàn quốc\`;
      paginationText.textContent = \`Hiển thị \${total ? start + 1 : 0} - \${end} / \${total.toLocaleString()} bản ghi\`;
      currPageLabel.textContent = \`\${globalPage} / \${totalPages}\`;
      prevPageBtn.disabled = globalPage <= 1;
      nextPageBtn.disabled = globalPage >= totalPages;

      globalTableBody.innerHTML = '';
      if (pageRows.length === 0) {
        globalTableBody.innerHTML = \`
          <tr>
            <td colspan="9" style="text-align: center; padding: 48px; color: var(--text-muted);">
              Không tìm thấy bản ghi nào khớp với điều kiện tìm kiếm. Hãy thử đổi từ khóa hoặc xóa bớt bộ lọc.
            </td>
          </tr>
        \`;
        return;
      }

      pageRows.forEach(r => {
        const blocks = r.block ? r.block.split(/[;,]/).map(b => b.trim()).filter(Boolean) : [];
        const blockHtml = blocks.length > 0 
          ? \`<div class="col-combos">\${blocks.map(b => \`<span class="combo-badge \${b === selectedCombo ? 'highlight' : ''}">\${b}</span>\`).join('')}</div>\`
          : '-';

        const markVal = r.mark !== null ? r.mark : '-';
        let markClass = 'score-badge';
        if (r.mark !== null) {
          if (r.mark >= 27 && r.mark <= 30) markClass += ' high';
          else if (r.mark >= 24 && r.mark < 27) markClass += ' mid';
          else if (r.mark > 30) markClass += ' scale-high';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><span class="school-code-tag">\${r.school_code}</span></td>
          <td style="font-weight: 600; color: #f1f5f9; font-size: 13px;">\${r.school_name}</td>
          <td class="col-code">\${r.major_code || '-'}</td>
          <td class="col-name">\${r.major_name}</td>
          <td style="font-size: 12px; color: #93c5fd;">\${r.method_name} (\${r.year})</td>
          <td>\${blockHtml}</td>
          <td><span class="\${markClass}">\${markVal}</span></td>
          <td class="col-quota">\${r.quota ?? '-'}</td>
          <td class="col-note">\${r.note || '-'}</td>
        \`;
        globalTableBody.appendChild(tr);
      });
    }

    function changeGlobalPage(delta) {
      globalPage += delta;
      updateGlobalPage();
    }

    // Export current filtered rows to CSV
    function exportCurrentViewCSV() {
      let rowsToExport = [];
      if (currentViewMode === 'school') {
        const school = DATA.find(s => s.school_code === selectedSchoolCode);
        if (!school) return;
        school.methods.forEach(m => {
          if (!matchMethod(m.method_name, m.method_alias)) return;
          m.cutoffs.forEach(c => {
            if (!matchCombo(c.block) || !matchScore(c.mark)) return;
            rowsToExport.push({
              ma_truong: school.school_code,
              ten_truong: school.school_name,
              phuong_thuc: m.method_name,
              nam: m.year,
              ma_nganh: c.major_code,
              ten_nganh: c.major_name,
              to_hop: c.block,
              diem_chuan: c.mark ?? '',
              chi_tieu: c.quota ?? '',
              ghi_chu: c.note || ''
            });
          });
        });
      } else {
        rowsToExport = cachedGlobalRows;
      }

      if (!rowsToExport.length) {
        showToast('⚠️ Không có dữ liệu để xuất file.');
        return;
      }

      const headers = ['Mã trường', 'Tên trường', 'Phương thức', 'Năm', 'Mã ngành', 'Tên ngành', 'Tổ hợp', 'Điểm chuẩn', 'Chỉ tiêu', 'Ghi chú'];
      let csvContent = '\uFEFF' + headers.join(',') + '\\n';

      rowsToExport.forEach(r => {
        const line = [
          r.ma_truong || r.school_code,
          \`"\${(r.ten_truong || r.school_name).replace(/"/g, '""')}"\`,
          \`"\${(r.phuong_thuc || r.method_name).replace(/"/g, '""')}"\`,
          r.nam || r.year,
          \`"\${(r.ma_nganh || r.major_code || '').replace(/"/g, '""')}"\`,
          \`"\${(r.ten_nganh || r.major_name).replace(/"/g, '""')}"\`,
          \`"\${(r.to_hop || r.block || '').replace(/"/g, '""')}"\`,
          r.diem_chuan ?? r.mark ?? '',
          r.chi_tieu ?? r.quota ?? '',
          \`"\${(r.ghi_chu || r.note || '').replace(/"/g, '""')}"\`
        ];
        csvContent += line.join(',') + '\\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', \`diem_chuan_\${currentViewMode}_\${new Date().toISOString().slice(0,10)}.csv\`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(\`✅ Đã xuất \${rowsToExport.length} bản ghi ra file CSV!\`);
    }

    // Toast helper
    function showToast(msg) {
      const toastMsg = document.getElementById('toastMsg');
      toastMsg.textContent = msg;
      toastBox.classList.add('show');
      setTimeout(() => toastBox.classList.remove('show'), 3000);
    }

    // Master filter change handler
    function onFiltersChanged() {
      if (currentViewMode === 'school') {
        renderSchoolSidebar();
        renderSchoolDetail();
      } else {
        renderGlobalResults();
      }
    }

    // Setup Event Listeners
    let searchDebounceTimer = null;
    globalSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchQuery = e.target.value;
        onFiltersChanged();
      }, 150);
    });

    comboFilter.addEventListener('change', (e) => {
      selectedCombo = e.target.value;
      onFiltersChanged();
    });

    minScoreInput.addEventListener('input', (e) => {
      minScoreVal = e.target.value ? parseFloat(e.target.value) : null;
      onFiltersChanged();
    });

    maxScoreInput.addEventListener('input', (e) => {
      maxScoreVal = e.target.value ? parseFloat(e.target.value) : null;
      onFiltersChanged();
    });

    sortFilter.addEventListener('change', (e) => {
      currentSort = e.target.value;
      onFiltersChanged();
    });

    methodPillsBar.querySelectorAll('.method-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        methodPillsBar.querySelectorAll('.method-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMethodFilter = btn.dataset.method;
        onFiltersChanged();
      });
    });

    // Keyboard shortcut '/' to search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== globalSearchInput) {
        e.preventDefault();
        globalSearchInput.focus();
        globalSearchInput.select();
      }
    });

    // Boot
    window.addEventListener('DOMContentLoaded', () => {
      initAlphabetBar();
      renderSchoolSidebar();
      renderSchoolDetail();
    });
  </script>
</body>
</html>
`;

// Save to database/tuyen_sinh_247_viewer.html
const outViewer = join(ROOT, "database", "tuyen_sinh_247_viewer.html");
writeFileSync(outViewer, htmlContent, "utf8");
console.log(`✅ Đã thiết kế lại HTML viewer siêu đẹp: ${outViewer}`);

// Also save to public/tuyen_sinh_247_viewer.html
const publicDir = join(ROOT, "public");
if (existsSync(publicDir)) {
  const publicViewer = join(publicDir, "tuyen_sinh_247_viewer.html");
  writeFileSync(publicViewer, htmlContent, "utf8");
  console.log(`✅ Đã đồng bộ sang public: ${publicViewer}`);
}
