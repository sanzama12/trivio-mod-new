/**
 * SERVICE LAYER — vận hành dữ liệu cho quản trị viên:
 *  - A01 Tổng quan chất lượng dữ liệu (chỉ số, vấn đề tự phát hiện, tiến độ xác minh, hoạt động gần đây)
 *  - A05 Điểm & Học phí (bảng 3 năm, xác minh hàng loạt, nguồn tham chiếu, xoá một năm, xuất CSV)
 */
import { describeAudit } from "../domain/audit-labels";
import { randomUUID } from "node:crypto";
import type { Program, PublicUser } from "../domain/types";
import { repositories } from "../repositories";
import { verifiedStatus } from "./verification";

type Fail = { ok: false; status: number; field?: string; message: string };
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

/** Năm điểm chuẩn mới nhất hệ thống đang theo dõi. */
export const LATEST_YEAR = 2025;
const YEARS = [LATEST_YEAR, LATEST_YEAR - 1, LATEST_YEAR - 2] as const;
/** Xác minh của quản trị viên còn hiệu lực trong 12 tháng (giống huy hiệu trường xác nhận). */
const ADMIN_VERIFY_DAYS = 365;

export type DataStatus = "verified" | "pending" | "missing";
export const DATA_STATUS_LABELS: Record<DataStatus, string> = { verified: "Đã xác minh", pending: "Chờ xác minh", missing: "Thiếu dữ liệu" };

const scoreOf = (p: Program, y: number) => p.cutoffs.find((c) => c.year === y)?.score ?? null;

export function dataStatus(p: Program, at: Date = new Date()): DataStatus {
  if ((p.cutoffs.length === 0 && p.altCutoffs.length === 0) || !p.source || p.source.trim().length < 3) return "missing";
  const admin = p.adminVerifiedAt ? Date.parse(p.adminVerifiedAt) : NaN;
  if (Number.isFinite(admin) && at.getTime() - admin <= ADMIN_VERIFY_DAYS * 86400_000 && admin <= at.getTime()) return "verified";
  if (verifiedStatus(p, at).active) return "verified";
  return "pending";
}

export type IssueKind = "missing-source" | "cutoff-jump" | "missing-latest" | "duplicate-code" | "school-submission" | "report";
export const ISSUE_LABELS: Record<IssueKind, string> = {
  "missing-source": "Thiếu nguồn chính thức",
  "cutoff-jump": "Điểm chuẩn biến động bất thường",
  "missing-latest": `Chưa có điểm chuẩn ${LATEST_YEAR}`,
  "duplicate-code": "Trùng mã xét tuyển",
  "school-submission": "Trường gửi bản sửa",
  report: "Người dùng báo sai",
};

export interface DataIssue {
  id: string;
  kind: IssueKind;
  severity: "high" | "medium" | "low";
  /** Cột "Loại dữ liệu". */
  dataType: string;
  /** Cột "Trường/Ngành". */
  target: string;
  /** Cột "Vấn đề". */
  problem: string;
  detail: string;
  /** "Xử lý" → trang sửa; "Xem" → trang công khai / chi tiết. */
  href: string;
  viewHref: string | null;
  at: string | null;
}

export interface ScoreRow {
  id: string;
  slug: string;
  name: string;
  admissionCode: string;
  school: string;
  schoolId: string;
  combos: string[];
  cutoffs: { year: number; score: number }[];
  durationYears: number;
  scores: Record<number, number | null>;
  diff: number | null;
  tuitionMin: number;
  tuitionMax: number;
  quota: number;
  source: string;
  sourceUrl: string | null;
  sourceCheckedAt: string | null;
  sourceNote: string | null;
  status: DataStatus;
  hidden: boolean;
}

async function schoolNames() {
  return new Map((await repositories.catalogAdmin.listSchools()).map((s) => [s.id, s.shortName]));
}

function toRow(p: Program, names: Map<string, string>): ScoreRow {
  const scores = Object.fromEntries(YEARS.map((y) => [y, scoreOf(p, y)])) as Record<number, number | null>;
  const a = scores[LATEST_YEAR];
  const b = scores[LATEST_YEAR - 1];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    admissionCode: p.admissionCode,
    school: names.get(p.schoolId) ?? p.schoolId,
    schoolId: p.schoolId,
    combos: p.combos,
    cutoffs: p.cutoffs,
    durationYears: p.durationYears,
    scores,
    diff: a != null && b != null ? Math.round((a - b) * 100) / 100 : null,
    tuitionMin: p.tuitionMin,
    tuitionMax: p.tuitionMax,
    quota: p.quota,
    source: p.source,
    sourceUrl: p.sourceUrl ?? null,
    sourceCheckedAt: p.sourceCheckedAt ?? null,
    sourceNote: p.sourceNote ?? null,
    status: dataStatus(p),
    hidden: !!p.hidden,
  };
}

async function setPatch(actor: PublicUser, p: Program, patch: Parameters<typeof repositories.programAdmin.setOverride>[1], action: "update" | "verify", changes: { field: string; before: string; after: string }[]) {
  const existing = (await repositories.programAdmin.getOverride(p.id)) ?? {};
  await repositories.programAdmin.setOverride(p.id, { ...existing, ...patch, updatedAt: now().slice(0, 7) }, {
    id: randomUUID(),
    at: now(),
    actorId: actor.id,
    actorEmail: actor.email,
    programId: p.id,
    action,
    changes,
  });
}

export const dataOpsService = {
  /** A01 — tổng quan chất lượng dữ liệu. */
  async overview() {
    const [programs, schools, submissions, reports, audit, batches] = await Promise.all([
      repositories.catalogAdmin.listPrograms(),
      repositories.catalogAdmin.listSchools(),
      repositories.schoolSubmissions.list({ status: "pending" }),
      repositories.dataReports.list({ status: ["moi", "dang-xu-ly"] }),
      repositories.programAdmin.listAudit(12),
      repositories.importBatches.list(5),
    ]);
    const names = new Map(schools.map((s) => [s.id, s.shortName]));
    const live = programs.filter((p) => !p.hidden);
    const statuses = live.map((p) => dataStatus(p));
    const count = (s: DataStatus) => statuses.filter((x) => x === s).length;
    const progress = { verified: count("verified"), pending: count("pending"), missing: count("missing") };
    const label = (p: Program) => `${p.admissionCode} · ${p.name} – ${names.get(p.schoolId) ?? p.schoolId}`;

    const issues: DataIssue[] = [];
    const codes = new Map<string, Program[]>();
    const majorNames = new Map((await repositories.catalogAdmin.listMajors()).map((m) => [m.id, m.name]));
    const target = (p: Program) => `${names.get(p.schoolId) ?? p.schoolId} · ${majorNames.get(p.majorId) ?? p.name}`;
    for (const p of live) {
      const key = `${p.schoolId}::${p.admissionCode.toUpperCase()}`;
      codes.set(key, [...(codes.get(key) ?? []), p]);
      const href = `/quan-tri/chuong-trinh/${encodeURIComponent(p.id)}`;
      const viewHref = `/chuong-trinh/${p.slug}`;
      if (!p.sourceUrl) issues.push({ id: `src-${p.id}`, kind: "missing-source", severity: "medium", dataType: "Nguồn", target: target(p), problem: `${p.admissionCode}: chưa có đường dẫn nguồn chính thức (https)`, detail: label(p), href: `/quan-tri/diem-hoc-phi?q=${encodeURIComponent(p.admissionCode)}`, viewHref, at: null });
      const a = scoreOf(p, LATEST_YEAR);
      const b = scoreOf(p, LATEST_YEAR - 1);
      if (a != null && b != null && Math.abs(a - b) > 2) issues.push({ id: `jump-${p.id}`, kind: "cutoff-jump", severity: "high", dataType: "Điểm chuẩn", target: target(p), problem: `Điểm chuẩn ${LATEST_YEAR} chênh ${(a - b).toFixed(2)} điểm so với ${LATEST_YEAR - 1} (${b} → ${a})`, detail: label(p), href, viewHref, at: null });
      if (a == null && p.cutoffs.length > 0) issues.push({ id: `latest-${p.id}`, kind: "missing-latest", severity: "medium", dataType: "Điểm chuẩn", target: target(p), problem: `Chưa nhập điểm chuẩn ${LATEST_YEAR}`, detail: label(p), href, viewHref, at: null });
    }
    for (const list of codes.values()) {
      if (list.length > 1) issues.push({ id: `dup-${list[0].id}`, kind: "duplicate-code", severity: "high", dataType: "Mã xét tuyển", target: names.get(list[0].schoolId) ?? list[0].schoolId, problem: `Mã ${list[0].admissionCode} trùng ở ${list.length} chương trình`, detail: list.map((p) => p.name).join(", "), href: `/quan-tri/chuong-trinh?q=${encodeURIComponent(list[0].admissionCode)}`, viewHref: null, at: null });
    }
    const FIELD: Record<string, string> = { cutoff: "Điểm chuẩn", tuition: "Học phí", quota: "Chỉ tiêu", combos: "Tổ hợp" };
    for (const s of submissions) {
      const p = programs.find((x) => x.id === s.programId);
      issues.push({ id: `sub-${s.id}`, kind: "school-submission", severity: "high", dataType: FIELD[s.field] ?? s.field, target: p ? target(p) : s.programId, problem: `Trường đề nghị sửa: ${s.current} → ${s.proposed}`, detail: p ? label(p) : s.programId, href: `/quan-tri?tab=de-xuat#de-xuat`, viewHref: s.evidenceUrl, at: s.createdAt });
    }
    const TOPIC: Record<string, string> = { "diem-chuan": "Điểm chuẩn", "hoc-phi": "Học phí", "chi-tieu": "Chỉ tiêu", "to-hop": "Tổ hợp", "thong-tin-truong": "Thông tin trường", khac: "Khác" };
    for (const r of reports) {
      const p = r.programId ? programs.find((x) => x.id === r.programId) : undefined;
      issues.push({ id: `rep-${r.id}`, kind: "report", severity: "low", dataType: TOPIC[r.topic] ?? "Khác", target: p ? target(p) : r.page.slice(0, 60) || "—", problem: `Người dùng báo: ${r.detail.slice(0, 120)}`, detail: r.page, href: "/quan-tri/bao-loi", viewHref: p ? `/chuong-trinh/${p.slug}` : null, at: r.createdAt });
    }
    const rank = { high: 0, medium: 1, low: 2 } as const;
    issues.sort((x, y) => rank[x.severity] - rank[y.severity] || (y.at ?? "").localeCompare(x.at ?? ""));

    const activity = [
      ...audit.map((e) => ({ id: e.id, at: e.at, who: e.actorEmail, text: describeAudit(e), kind: e.targetType ?? "program" })),
      ...batches.map((b) => ({ id: b.id, at: b.at, who: b.byName, text: `Nhập "${b.fileName}": ${b.created} mới, ${b.updated} cập nhật`, kind: "import" as const })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 10);

    return {
      stats: {
        schools: schools.filter((s) => !s.hidden).length,
        programs: live.length,
        verifiedPct: live.length ? Math.round((progress.verified / live.length) * 100) : 0,
        pending: progress.pending,
        missingSource: live.filter((p) => !p.sourceUrl).length,
        openIssues: issues.length,
      },
      issues: issues.slice(0, 200),
      issueCounts: Object.fromEntries((Object.keys(ISSUE_LABELS) as IssueKind[]).map((k) => [k, issues.filter((i) => i.kind === k).length])) as Record<IssueKind, number>,
      progress,
      activity,
    };
  },

  /** A05 — bảng điểm & học phí. */
  async scoreRows(): Promise<ScoreRow[]> {
    const [programs, names] = await Promise.all([repositories.catalogAdmin.listPrograms(), schoolNames()]);
    return programs.map((p) => toRow(p, names)).sort((a, b) => a.school.localeCompare(b.school, "vi") || a.admissionCode.localeCompare(b.admissionCode));
  },

  /** Xác minh hàng loạt: ghi ngày quản trị viên đã đối chiếu với nguồn. Bỏ qua dòng thiếu dữ liệu. */
  async bulkVerify(actor: PublicUser, idsInput: unknown): Promise<{ ok: true; verified: number; skipped: number } | Fail> {
    if (!Array.isArray(idsInput) || idsInput.length === 0) return { ok: false, status: 400, message: "Chọn ít nhất một dòng." };
    if (idsInput.length > 300) return { ok: false, status: 400, message: "Tối đa 300 dòng mỗi lần." };
    const ids = [...new Set(idsInput.filter((x): x is string => typeof x === "string"))];
    const programs = await repositories.catalogAdmin.listPrograms();
    let verified = 0;
    let skipped = 0;
    for (const id of ids) {
      const p = programs.find((x) => x.id === id);
      if (!p || dataStatus(p) === "missing") {
        skipped++;
        continue;
      }

      // Quy tắc quản trị dữ liệu (GIAI ĐOẠN 3): Không được xác minh nếu thiếu URL nguồn hoặc tài liệu minh chứng hợp lệ
      const hasValidProof =
        (!!p.sourceUrl && p.sourceUrl.startsWith("https://")) ||
        !!p.schoolVerifiedAt ||
        (!!p.source && p.source.includes("Đề án tuyển sinh"));

      if (!hasValidProof) {
        skipped++;
        continue;
      }

      await setPatch(actor, p, { adminVerifiedAt: today() }, "verify", [{ field: "Xác minh với nguồn chính thức", before: p.adminVerifiedAt ?? "—", after: today() }]);
      verified++;
    }
    return { ok: true, verified, skipped };
  },

  /** Nguồn tham chiếu: URL https + ngày kiểm tra + ghi chú. */
  async saveSource(actor: PublicUser, id: string, input: Record<string, unknown>): Promise<{ ok: true } | Fail> {
    const p = await repositories.catalogAdmin.getProgram(id);
    if (!p) return { ok: false, status: 404, message: "Không tìm thấy chương trình." };
    const rawUrl = String(input.sourceUrl ?? "").trim().slice(0, 300);
    let sourceUrl: string | null = null;
    if (rawUrl) {
      try {
        const u = new URL(rawUrl);
        if (u.protocol !== "https:") throw new Error("http");
        sourceUrl = u.toString();
      } catch {
        return { ok: false, status: 400, field: "sourceUrl", message: "Nguồn phải là đường dẫn https hợp lệ." };
      }
    }
    const checked = String(input.sourceCheckedAt ?? "").trim();
    let sourceCheckedAt: string | null = null;
    if (checked) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checked) || Number.isNaN(Date.parse(checked))) return { ok: false, status: 400, field: "sourceCheckedAt", message: "Ngày kiểm tra không hợp lệ." };
      if (checked > today()) return { ok: false, status: 400, field: "sourceCheckedAt", message: "Ngày kiểm tra không được ở tương lai." };
      sourceCheckedAt = checked;
    }
    const sourceNote = String(input.sourceNote ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300) || null;
    const changes = [
      ["Nguồn (URL)", p.sourceUrl ?? "—", sourceUrl ?? "—"],
      ["Ngày kiểm tra nguồn", p.sourceCheckedAt ?? "—", sourceCheckedAt ?? "—"],
      ["Ghi chú nguồn", p.sourceNote ?? "—", sourceNote ?? "—"],
    ]
      .filter(([, a, b]) => a !== b)
      .map(([field, before, after]) => ({ field, before, after }));
    if (changes.length === 0) return { ok: true };
    await setPatch(actor, p, { sourceUrl, sourceCheckedAt, sourceNote }, "update", changes);
    return { ok: true };
  },

  /** Xoá điểm chuẩn một năm (nhập nhầm). */
  async clearYear(actor: PublicUser, id: string, yearInput: unknown): Promise<{ ok: true } | Fail> {
    const p = await repositories.catalogAdmin.getProgram(id);
    if (!p) return { ok: false, status: 404, message: "Không tìm thấy chương trình." };
    const year = Number(yearInput);
    const score = scoreOf(p, year);
    if (score == null) return { ok: false, status: 400, message: `Chưa có điểm chuẩn năm ${Number.isFinite(year) ? year : "?"}.` };
    await setPatch(actor, p, { cutoffs: p.cutoffs.filter((c) => c.year !== year) }, "update", [{ field: `Điểm chuẩn ${year}`, before: String(score), after: "— (đã xoá)" }]);
    return { ok: true };
  },

  /** CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). Chặn công thức (CSV injection). */
  toCsv(rows: ScoreRow[]): string {
    const esc = (v: unknown) => {
      let s = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = ["ma_xet_tuyen", "ten_chuong_trinh", "truong", ...YEARS.map((y) => `diem_${y}`), "chenh_lech", "hoc_phi_min", "hoc_phi_max", "chi_tieu", "nguon", "nguon_url", "ngay_kiem_tra", "trang_thai"];
    const lines = rows.map((r) =>
      [r.admissionCode, r.name, r.school, ...YEARS.map((y) => r.scores[y]), r.diff, r.tuitionMin, r.tuitionMax, r.quota, r.source, r.sourceUrl, r.sourceCheckedAt, DATA_STATUS_LABELS[r.status]].map(esc).join(","),
    );
    return `﻿${head.join(",")}\n${lines.join("\n")}\n`;
  },
};
