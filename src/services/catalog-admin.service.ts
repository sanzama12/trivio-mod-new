/**
 * SERVICE LAYER — quản trị danh mục (A02 Trường & Cơ sở, A03 Ngành đào tạo, A04 Chương trình đào tạo).
 * Bản ghi gốc được ghi đè, bản ghi mới lưu riêng; "xoá" = tạm ẩn (giữ lịch sử, khôi phục được). Mọi thay đổi có nhật ký.
 */
import { createId, isMajorCode } from "@database/identity";
import { randomUUID } from "node:crypto";
import type { AdmissionMethod, AuditEntry, Major, MajorGroup, PublicUser, Program, School, SchoolType } from "../domain/types";
import { PROVINCES, PROVINCE_REGION } from "../domain/provinces";
import { repositories } from "@database/repositories";
import { normalizeVi } from "../lib/text";
import { SCHOOL_TYPE_LABELS } from "./program.filters";
import { defaultRiasecForGroup } from "./major-mapping.service";

import { countBy, groupBy } from '../lib/collections';

type Fail = { ok: false; status: number; field?: string; message: string };
const now = () => new Date().toISOString();
const str = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export const slugify = (s: string) => normalizeVi(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "muc";
const uniqueSlug = (base: string, taken: Set<string>) => {
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
};

async function audit(actor: PublicUser, targetType: AuditEntry["targetType"], id: string, action: AuditEntry["action"], changes: AuditEntry["changes"]) {
  await repositories.audit.append({ id: randomUUID(), at: now(), actorId: actor.id, actorEmail: actor.email, programId: id, targetType, action, changes });
}

/** Website: tự thêm https://; cảnh báo (không chặn) khi không phải https hoặc không thuộc .edu.vn. */
export function checkWebsite(raw: unknown): { url: string; warning: string | null } | Fail {
  const v = str(raw, 200);
  if (!v) return { url: "", warning: "Chưa có website trường" };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    return { ok: false, status: 400, field: "website", message: "Website không hợp lệ." };
  }
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) return { ok: false, status: 400, field: "website", message: "Website không hợp lệ." };
  const warning = !/^https:\/\//i.test(v) || !/\.edu\.vn$/i.test(url.hostname) ? "URL chưa được xác minh (không phải https hoặc không thuộc .edu.vn)" : null;
  return { url: `${url.protocol}//${url.hostname}`, warning };
}

/** Logo chỉ nhận HTTPS; để trống là trạng thái hợp lệ và UI sẽ dùng mã trường. */
export function checkLogoUrl(raw: unknown): { url: string | null } | Fail {
  const value = str(raw, 500);
  if (!value) return { url: null };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) throw new Error("invalid");
    return { url: url.toString() };
  } catch {
    return { ok: false, status: 400, field: "logoUrl", message: "Logo phải là một URL HTTPS hợp lệ." };
  }
}

/** Ảnh bìa chỉ nhận HTTPS; để trống là trạng thái hợp lệ. */
export const checkCoverUrl = (raw: unknown): { url: string | null } | Fail => {
  const value = str(raw, 500);
  if (!value) return { url: null };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) throw new Error("invalid");
    return { url: url.toString() };
  } catch {
    return { ok: false, status: 400, field: "coverUrl", message: "Ảnh bìa phải là một URL HTTPS hợp lệ." };
  }
};

export interface SchoolRow {
  school: School;
  campuses: number;
  majors: number;
  programs: number;
}

export interface MajorRow {
  major: Major;
  groupName: string;
  programs: number;
}

export const catalogAdminService = {
  /** Dữ liệu cho biểu mẫu quản trị, bao gồm cả bản ghi đang ẩn. */
  async getSchoolOptions(): Promise<School[]> {
    return repositories.catalogAdmin.listSchools();
  },

  async getMajorOptions(): Promise<Major[]> {
    return repositories.catalogAdmin.listMajors();
  },

  async getMajorGroups(): Promise<MajorGroup[]> {
    return repositories.majors.findGroups();
  },

  async schools(): Promise<SchoolRow[]> {
    const [schools, programs] = await Promise.all([repositories.catalogAdmin.listSchools(), repositories.catalogAdmin.listPrograms()]);
    const liveProgramsBySchool = groupBy(programs.filter((program) => !program.hidden), (program) => program.schoolId);
    return schools.map((school) => {
      const ps = liveProgramsBySchool.get(school.id) ?? [];
      return { school, campuses: school.campuses.length, majors: new Set(ps.map((p) => p.majorId)).size, programs: ps.length };
    });
  },

  async saveSchool(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; id: string; warning: string | null } | Fail> {
    const id = typeof input.id === "string" && input.id ? input.id : null;
    const all = await repositories.catalogAdmin.listSchools();
    const current = id ? all.find((s) => s.id === id) : null;
    if (id && !current) return { ok: false, status: 404, message: "Không tìm thấy trường." };
    const name = str(input.name, 120);
    if (name.length < 4) return { ok: false, status: 400, field: "name", message: "Tên trường là bắt buộc (ít nhất 4 ký tự)." };
    const code = str(input.code, 10).toUpperCase();
    if (!code) return { ok: false, status: 400, field: "code", message: "Mã trường là bắt buộc" };
    if (!/^[A-Z0-9]{2,6}$/.test(code)) return { ok: false, status: 400, field: "code", message: "Mã trường gồm 2–6 chữ in hoa hoặc số (VD: BKA)." };
    if (all.some((s) => s.code === code && s.id !== id)) return { ok: false, status: 409, field: "code", message: "Mã trường đã tồn tại." };
    const type = input.type as SchoolType;
    if (!(type in SCHOOL_TYPE_LABELS)) return { ok: false, status: 400, field: "type", message: "Chọn loại hình trường." };
    const city = str(input.city, 40);
    if (!(PROVINCES as readonly string[]).includes(city)) return { ok: false, status: 400, field: "city", message: "Vui lòng chọn khu vực" };
    const web = checkWebsite(input.website);
    if ("ok" in web) return web;
    const logo = checkLogoUrl(input.logoUrl);
    if ("ok" in logo) return logo;
    const cover = checkCoverUrl(input.coverUrl);
    if ("ok" in cover) return cover;
    const description = str(input.description, 1000);
    const shortName = str(input.shortName, 60) || name.replace(/^Trường\s+/i, "").replace(/^Đại học/i, "ĐH");
    const campusesIn = Array.isArray(input.campuses) ? input.campuses.map((c) => str(c, 160)).filter(Boolean).slice(0, 12) : [];
    const base: School = current ?? {
      id: createId("school"),
      slug: uniqueSlug(slugify(name), new Set(all.map((s) => s.slug))),
      code,
      name,
      shortName,
      type,
      region: PROVINCE_REGION[city as keyof typeof PROVINCE_REGION],
      city,
      campuses: [city],
      founded: 0,
      students: 0,
      highlight: "",
      website: web.url,
      logoUrl: logo.url,
      coverUrl: cover.url,
      description,
      scholarships: "",
    };
    const next: School = {
      ...base,
      code,
      name,
      shortName,
      type,
      city,
      region: PROVINCE_REGION[city as keyof typeof PROVINCE_REGION],
      website: web.url,
      logoUrl: logo.url,
      coverUrl: cover.url,
      description: description || base.description,
      campuses: campusesIn.length ? campusesIn : base.campuses.length ? base.campuses : [city],
    };
    await repositories.catalogAdmin.saveSchool(next);
    const changes = current
      ? (["name", "code", "type", "city", "website", "logoUrl", "coverUrl", "description"] as const).filter((k) => String(current[k]) !== String(next[k])).map((k) => ({ field: k, before: String(current[k] ?? "—"), after: String(next[k] ?? "—") }))
      : [{ field: "Trường mới", before: "—", after: `${code} · ${name}` }];
    if (changes.length) await audit(actor, "school", next.id, current ? "update" : "create", changes);
    return { ok: true, id: next.id, warning: web.warning };
  },

  async setSchoolHidden(actor: PublicUser, id: string, hidden: boolean): Promise<{ ok: true } | Fail> {
    const s = (await repositories.catalogAdmin.listSchools()).find((x) => x.id === id);
    if (!s) return { ok: false, status: 404, message: "Không tìm thấy trường." };
    await repositories.catalogAdmin.saveSchool({ ...s, hidden });
    await audit(actor, "school", id, "update", [{ field: "Trạng thái", before: s.hidden ? "Tạm ẩn" : "Hoạt động", after: hidden ? "Tạm ẩn" : "Hoạt động" }]);
    return { ok: true };
  },

  async majors(): Promise<MajorRow[]> {
    const [majors, groups, programs] = await Promise.all([repositories.catalogAdmin.listMajors(), repositories.majors.findGroups(), repositories.catalogAdmin.listPrograms()]);
    const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
    const programCountByMajor = countBy(programs.filter((program) => !program.hidden), (program) => program.majorId);
    return majors.map((major) => ({ major, groupName: groupNameById.get(major.groupId) ?? major.groupId, programs: programCountByMajor.get(major.id) ?? 0 }));
  },

  async saveMajor(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; id: string } | Fail> {
    const id = typeof input.id === "string" && input.id ? input.id : null;
    const all = await repositories.catalogAdmin.listMajors();
    const current = id ? all.find((m) => m.id === id) : null;
    if (id && !current) return { ok: false, status: 404, message: "Không tìm thấy ngành." };
    const code = str(input.code, 10);
    if (code ? !isMajorCode(code) : !current) return { ok: false, status: 400, field: "code", message: "Mã ngành gồm 7 chữ số (VD: 7480201)." };
    if (code && all.some((m) => m.code === code && m.id !== id)) return { ok: false, status: 409, field: "code", message: "Mã ngành đã tồn tại." };
    const name = str(input.name, 120);
    if (name.length < 3) return { ok: false, status: 400, field: "name", message: "Tên ngành là bắt buộc." };
    const groups = await repositories.majors.findGroups();
    const groupId = str(input.groupId, 40);
    if (!groups.some((g) => g.id === groupId)) return { ok: false, status: 400, field: "groupId", message: "Chọn nhóm ngành." };
    const riasec = current?.riasec ?? defaultRiasecForGroup(groupId);
    const summary = str(input.summary, 300);
    if (summary.length < 10) return { ok: false, status: 400, field: "summary", message: "Mô tả tóm tắt cần ít nhất 10 ký tự." };
    const base: Major = current ?? {
      id: createId("major"),
      slug: uniqueSlug(slugify(name), new Set(all.map((m) => m.slug))),
      code,
      name,
      groupId,
      riasec,
      summary,
      description: summary,
      // Ngành mới ở trạng thái "Chờ duyệt" (chưa hiện cho học sinh) tới khi quản trị viên duyệt.
      hidden: true,
    };
    const next: Major = { ...base, hidden: current ? current.hidden : true, code, name, groupId, riasec, summary, description: str(input.description, 1500) || base.description || summary };
    await repositories.catalogAdmin.saveMajor(next);
    const changes = current
      ? (["code", "name", "groupId", "summary"] as const).filter((k) => String(current[k]) !== String(next[k])).map((k) => ({ field: k, before: String(current[k]), after: String(next[k]) }))
      : [{ field: "Ngành mới", before: "—", after: `${code} · ${name}` }];
    if (changes.length) await audit(actor, "major", next.id, current ? "update" : "create", changes);
    return { ok: true, id: next.id };
  },

  async setMajorHidden(actor: PublicUser, id: string, hidden: boolean): Promise<{ ok: true } | Fail> {
    const m = (await repositories.catalogAdmin.listMajors()).find((x) => x.id === id);
    if (!m) return { ok: false, status: 404, message: "Không tìm thấy ngành." };
    await repositories.catalogAdmin.saveMajor({ ...m, hidden });
    await audit(actor, "major", id, "update", [{ field: "Trạng thái", before: m.hidden ? "Chờ duyệt / ẩn" : "Đã duyệt", after: hidden ? "Chờ duyệt / ẩn" : "Đã duyệt" }]);
    return { ok: true };
  },

  async createProgram(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; id: string; slug: string } | Fail> {
    const [schools, majors, programs, combos] = await Promise.all([
      repositories.catalogAdmin.listSchools(),
      repositories.catalogAdmin.listMajors(),
      repositories.catalogAdmin.listPrograms(),
      repositories.catalog.findCombos(),
    ]);
    const school = schools.find((s) => s.id === input.schoolId);
    if (!school) return { ok: false, status: 400, field: "schoolId", message: "Chọn trường." };
    const major = majors.find((m) => m.id === input.majorId);
    if (!major) return { ok: false, status: 400, field: "majorId", message: "Chọn ngành liên kết." };
    const name = str(input.name, 120) || major.name;
    const admissionCode = str(input.admissionCode, 20).toUpperCase();
    if (!/^[A-Z0-9-]{2,20}$/.test(admissionCode)) return { ok: false, status: 400, field: "admissionCode", message: "Mã xét tuyển gồm 2–20 chữ, số hoặc dấu gạch." };
    if (programs.some((p) => p.schoolId === school.id && p.admissionCode.toUpperCase() === admissionCode)) return { ok: false, status: 409, field: "admissionCode", message: "Mã xét tuyển đã có ở trường này." };
    const trainingType = (["Chính quy", "Chất lượng cao", "Tiên tiến", "Quốc tế"] as const).find((t) => t === input.trainingType) ?? "Chính quy";
    const comboList = Array.isArray(input.combos) ? input.combos.map((c) => String(c).toUpperCase()).filter((c) => combos.some((x) => x.code === c)) : [];
    const n = (v: unknown) => (v === "" || v == null ? null : Number(String(v).replace(",", ".")));
    const quota = n(input.quota);
    if (quota == null || !Number.isInteger(quota) || quota < 1 || quota > 100000) return { ok: false, status: 400, field: "quota", message: "Chỉ tiêu là số nguyên từ 1." };
    const tMin = n(input.tuitionMin);
    const tMax = n(input.tuitionMax) ?? tMin;
    if (tMin == null || !Number.isFinite(tMin) || tMin < 0 || tMin > 2000 || tMax == null || tMax < tMin || tMax > 2000) return { ok: false, status: 400, field: "tuitionMin", message: "Học phí (triệu/năm) không hợp lệ — tối thiểu ≤ tối đa ≤ 2000." };
    const years = n(input.durationYears) ?? 4;
    if (!Number.isFinite(years) || years < 2 || years > 7) return { ok: false, status: 400, field: "durationYears", message: "Thời gian đào tạo 2–7 năm." };
    const cutoffs: Program["cutoffs"] = [];
    for (const y of [2025, 2024, 2023]) {
      const v = n((input.cutoffs as Record<string, unknown> | undefined)?.[y]);
      if (v == null) continue;
      if (!Number.isFinite(v) || v < 0 || v > 30) return { ok: false, status: 400, field: "cutoffs", message: `Điểm chuẩn ${y} phải từ 0 đến 30.` };
      cutoffs.push({ year: y, score: Math.round(v * 100) / 100 });
    }
    if (cutoffs.length && comboList.length === 0) return { ok: false, status: 400, field: "combos", message: "Chương trình xét điểm thi cần ít nhất một tổ hợp." };
    const source = str(input.source, 200);
    if (source.length < 3) return { ok: false, status: 400, field: "source", message: "Ghi rõ nguồn dữ liệu (VD: Đề án tuyển sinh 2026 của trường)." };
    const id = createId("program");
    const slug = uniqueSlug(`${major.slug}-${school.code.toLowerCase()}`, new Set(programs.map((p) => p.slug)));
    const methods: AdmissionMethod[] = cutoffs.length
      ? [{ key: "thpt", name: "Xét điểm thi tốt nghiệp THPT", desc: `Theo tổng điểm tổ hợp (${comboList.join(", ")}) cộng điểm ưu tiên.`, requirement: `${cutoffs[0].score.toFixed(2)} điểm`, tag: "Điểm thi" }]
      : [{ name: "Xét học bạ THPT", desc: "Theo đề án tuyển sinh của trường.", requirement: "Theo đề án", tag: "Học bạ" }];
    const latest = cutoffs[0]?.score;
    const program: Program = {
      id,
      slug,
      schoolId: school.id,
      majorId: major.id,
      name,
      admissionCode,
      trainingType,
      campus: str(input.campus, 160) || school.campuses[0] || school.city,
      combos: comboList,
      cutoffs,
      altCutoffs: [],
      tuitionMin: Math.round(tMin * 10) / 10,
      tuitionMax: Math.round(tMax * 10) / 10,
      durationYears: Math.round(years * 2) / 2,
      quota,
      competition: latest === undefined ? "Trung bình" : latest >= 27 || quota <= 100 ? "Cao" : latest >= 24 ? "Trung bình" : "Thấp",
      methods,
      overview: str(input.overview, 1000) || `Chương trình ${name} của ${school.name}. ${major.summary}`,
      updatedAt: now().slice(0, 7),
      source,
      sourceUrl: null,
    };
    await repositories.catalogAdmin.createProgram(program);
    await audit(actor, "program", id, "create", [{ field: "Chương trình mới", before: "—", after: `${admissionCode} · ${name} – ${school.shortName}` }]);
    return { ok: true, id, slug };
  },

  async setProgramHidden(actor: PublicUser, id: string, hidden: boolean): Promise<{ ok: true } | Fail> {
    const p = await repositories.catalogAdmin.getProgram(id);
    if (!p) return { ok: false, status: 404, message: "Không tìm thấy chương trình." };

    await repositories.programAdmin.patchProgram(id, { hidden }, {
      id: randomUUID(),
      at: now(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: id,
      action: "update",
      changes: [{ field: "Trạng thái", before: p.hidden ? "Tạm ẩn" : "Tuyển sinh", after: hidden ? "Tạm ẩn" : "Tuyển sinh" }],
    });
    return { ok: true };
  },
};
