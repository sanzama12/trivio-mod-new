/**
 * SERVICE LAYER — Quản lý Nhập liệu Tuyển sinh Tích hợp (Unified Admissions Entry).
 * 
 * Gom toàn bộ quy trình phân mảnh trước đây:
 *   Trường & Cơ sở + Ngành đào tạo + Điểm chuẩn + Học phí chuẩn
 * thành MỘT chức năng duy nhất, linh hoạt và dung thứ:
 *   - Chưa có điểm chuẩn? Vẫn cho lưu (trạng thái Chờ công bố).
 *   - Chưa có học phí? Vẫn cho lưu (trạng thái Chờ học phí).
 *   - Trường chưa tồn tại? Tự động tạo trường mới.
 *   - Ngành chưa tồn tại? Tự động tạo ngành mới.
 *   - Lần sau dễ dàng lọc và sửa bổ sung cho đầy đủ ngay trên bảng.
 */
import { randomUUID } from "node:crypto";
import type { Program, PublicUser, School, Major, SchoolType, RiasecType } from "../domain/types";
import { PROVINCES, PROVINCE_REGION } from "../domain/provinces";
import { repositories } from "../repositories";
import { normalizeVi } from "../lib/text";
import { slugify } from "./catalog-admin.service";

export interface UnifiedEntryInput {
  id?: string; // Nếu sửa chương trình đã có
  schoolCode: string; // VD: "BKA", "HUST", "FPT"
  schoolName?: string; // Tên trường (nếu tạo trường mới)
  schoolType?: SchoolType; // "cong-lap" | "tu-thuc" | "quoc-te"
  city?: string; // Tỉnh / Thành phố
  campus?: string; // Cơ sở đào tạo cụ thể
  majorName: string; // Tên ngành đào tạo
  majorCode?: string; // Mã ngành (VD: 7480201)
  admissionCode?: string; // Mã xét tuyển (VD: IT1)
  year?: number; // Năm tuyển sinh (mặc định 2026)
  score?: number | null; // Điểm chuẩn (để trống nếu chưa công bố)
  tuitionMin?: number | null; // Học phí tối thiểu triệu/năm
  tuitionMax?: number | null; // Học phí tối đa triệu/năm
  combos?: string[]; // Tổ hợp môn (VD: ["A00", "A01"])
  quota?: number | null; // Chỉ tiêu tuyển sinh
  trainingType?: string; // "Chính quy" | "Chất lượng cao" | ...
  source?: string; // Nguồn thông tin
}

export interface UnifiedRowItem {
  id: string; // program id
  schoolId: string;
  schoolCode: string;
  schoolName: string;
  schoolCity: string;
  campus: string;
  majorId: string;
  majorCode: string;
  majorName: string;
  admissionCode: string;
  latestYear: number;
  latestScore: number | null;
  tuitionMin: number;
  tuitionMax: number;
  combos: string[];
  quota: number;
  missingScore: boolean;
  missingTuition: boolean;
  isComplete: boolean;
  updatedAt: string;
}

const now = () => new Date().toISOString();
const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanNum = (v: unknown): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const unifiedEntryService = {
  /**
   * Tạo mới hoặc cập nhật 1 bản ghi tích hợp:
   * Tự động sinh/cập nhật Trường -> Ngành -> Chương trình -> Điểm & Học phí.
   */
  async save(actor: PublicUser, input: UnifiedEntryInput) {
    const rawCode = str(input.schoolCode, 10).toUpperCase();
    if (!rawCode) {
      return { ok: false, status: 400, field: "schoolCode", message: "Vui lòng nhập mã trường (VD: BKA, NEU, FPT)." } as const;
    }
    const rawMajorName = str(input.majorName, 120);
    if (!rawMajorName) {
      return { ok: false, status: 400, field: "majorName", message: "Vui lòng nhập tên ngành hoặc chương trình đào tạo." } as const;
    }

    const currentYear = new Date().getFullYear();
    const targetYear = input.year && Number.isInteger(input.year) && input.year >= 2020 ? input.year : currentYear;

    // ── 1. Xử lý Trường & Cơ sở ───────────────────────────────────────────────
    const allSchools = await repositories.catalogAdmin.listSchools();
    let school = allSchools.find((s) => s.code.toUpperCase() === rawCode);
    let isNewSchool = false;

    const city = str(input.city, 40) || (school ? school.city : "Thành phố Hà Nội");
    const campusIn = str(input.campus, 160);

    if (!school) {
      isNewSchool = true;
      const schoolName = str(input.schoolName, 120) || `Trường Đại học ${rawCode}`;
      const shortName = schoolName.replace(/^Trường\s+/i, "").replace(/^Đại học/i, "ĐH");
      const region = PROVINCE_REGION[city as keyof typeof PROVINCE_REGION] ?? "bac";
      const newSchool: School = {
        id: `sch-${slugify(rawCode)}`,
        slug: slugify(schoolName),
        code: rawCode,
        name: schoolName,
        shortName,
        type: input.schoolType || "cong-lap",
        region,
        city,
        campuses: campusIn ? [campusIn] : [city],
        founded: 0,
        students: 0,
        highlight: "",
        website: "",
        description: "",
        scholarships: "",
        custom: true,
      };
      await repositories.catalogAdmin.saveSchool(newSchool);
      await repositories.audit.append({
        id: randomUUID(),
        at: now(),
        actorId: actor.id,
        actorEmail: actor.email,
        programId: newSchool.id,
        targetType: "school",
        action: "create",
        changes: [{ field: "Trường mới (Nhập tích hợp)", before: "—", after: `${newSchool.code} · ${newSchool.name}` }],
      });
      school = newSchool;
    } else if (campusIn && !school.campuses.some((c) => c.toLowerCase() === campusIn.toLowerCase())) {
      // Bổ sung cơ sở mới vào trường nếu chưa có
      const updatedCampuses = [...school.campuses, campusIn].slice(0, 15);
      await repositories.catalogAdmin.saveSchool({ ...school, campuses: updatedCampuses });
      school.campuses = updatedCampuses;
    }

    // ── 2. Xử lý Ngành đào tạo ────────────────────────────────────────────────
    const allMajors = await repositories.catalogAdmin.listMajors();
    const rawMajorCode = str(input.majorCode, 15).trim();
    let major = allMajors.find(
      (m) =>
        (rawMajorCode && m.code === rawMajorCode) ||
        normalizeVi(m.name).toLowerCase() === normalizeVi(rawMajorName).toLowerCase(),
    );
    let isNewMajor = false;

    if (!major) {
      isNewMajor = true;
      const groups = await repositories.majors.findGroups();
      const defaultGroup = groups[0]?.id || "cntt";
      const finalMajorCode = rawMajorCode && /^\d{7}$/.test(rawMajorCode) ? rawMajorCode : `799${Math.floor(1000 + Math.random() * 9000)}`;
      const majorId = `maj-${slugify(rawMajorName)}`;
      const newMajor: Major = {
        id: majorId,
        slug: slugify(rawMajorName),
        code: finalMajorCode,
        name: rawMajorName,
        groupId: defaultGroup,
        riasec: ["I", "R", "C"],
        summary: `Ngành ${rawMajorName} đào tạo chuyên môn tại trường đại học.`,
        description: "",
        curriculum: [],
        careers: [],
        demand: "Trung bình",
        growth: 0,
        custom: true,
        hidden: false,
      };
      await repositories.catalogAdmin.saveMajor(newMajor);
      await repositories.audit.append({
        id: randomUUID(),
        at: now(),
        actorId: actor.id,
        actorEmail: actor.email,
        programId: newMajor.id,
        targetType: "major",
        action: "create",
        changes: [{ field: "Ngành mới (Nhập tích hợp)", before: "—", after: `${newMajor.code} · ${newMajor.name}` }],
      });
      major = newMajor;
    }

    // ── 3. Xử lý Chương trình, Điểm chuẩn & Học phí ────────────────────────────
    const allPrograms = await repositories.catalogAdmin.listPrograms();
    const admissionCode = str(input.admissionCode, 20).toUpperCase() || (rawMajorCode ? rawMajorCode.toUpperCase() : slugify(rawMajorName).toUpperCase());
    
    // Tìm chương trình đã có
    let existingProgram = input.id ? allPrograms.find((p) => p.id === input.id) : null;
    if (!existingProgram) {
      existingProgram = allPrograms.find((p) => p.schoolId === school.id && p.admissionCode.toUpperCase() === admissionCode) ?? null;
    }
    if (!existingProgram) {
      existingProgram = allPrograms.find((p) => p.schoolId === school.id && p.majorId === major.id) ?? null;
    }

    // Xử lý điểm chuẩn (nếu có; nếu null/trống thì lưu [] hoặc giữ nguyên)
    const scoreVal = cleanNum(input.score);
    if (scoreVal != null && (scoreVal < 0 || scoreVal > 30)) {
      return { ok: false, status: 400, field: "score", message: "Điểm chuẩn xét thang 30 phải từ 0 đến 30." } as const;
    }

    // Xử lý học phí
    const tMin = cleanNum(input.tuitionMin) ?? 0;
    const tMax = cleanNum(input.tuitionMax) ?? (tMin > 0 ? tMin : 0);

    // Xử lý tổ hợp môn
    const combos = Array.isArray(input.combos)
      ? input.combos.map((c) => String(c).toUpperCase().trim()).filter(Boolean)
      : typeof input.combos === "string"
        ? String(input.combos).toUpperCase().split(/[\s,;/]+/).filter(Boolean)
        : [];

    const quota = cleanNum(input.quota) ?? 100;
    const campus = campusIn || school.campuses[0] || school.city;

    if (existingProgram) {
      // ── Cập nhật chương trình có sẵn ─────────────────────────────────────────
      let updatedCutoffs = [...existingProgram.cutoffs];
      if (scoreVal != null) {
        updatedCutoffs = [...updatedCutoffs.filter((c) => c.year !== targetYear), { year: targetYear, score: Math.round(scoreVal * 100) / 100 }].sort((a, b) => b.year - a.year);
      }

      const patch: Partial<Program> = {
        name: rawMajorName || existingProgram.name,
        admissionCode: admissionCode || existingProgram.admissionCode,
        campus: campus || existingProgram.campus,
        cutoffs: updatedCutoffs,
        tuitionMin: tMin > 0 ? tMin : existingProgram.tuitionMin,
        tuitionMax: tMax > 0 ? tMax : existingProgram.tuitionMax,
        quota: quota > 0 ? quota : existingProgram.quota,
        combos: combos.length ? combos : existingProgram.combos,
        updatedAt: now().slice(0, 7),
      };
      if (input.source) patch.source = str(input.source, 200);

      const existingOverride = (await repositories.programAdmin.getOverride(existingProgram.id)) ?? {};
      await repositories.programAdmin.setOverride(existingProgram.id, { ...existingOverride, ...patch }, {
        id: randomUUID(),
        at: now(),
        actorId: actor.id,
        actorEmail: actor.email,
        programId: existingProgram.id,
        targetType: "program",
        action: "update",
        changes: [{ field: "Cập nhật tích hợp", before: "—", after: `${school.code} · ${rawMajorName}` }],
      });

      return {
        ok: true,
        action: "updated" as const,
        programId: existingProgram.id,
        schoolId: school.id,
        majorId: major.id,
        isNewSchool,
        isNewMajor,
        hasScore: scoreVal != null || updatedCutoffs.length > 0,
        hasTuition: tMin > 0,
        message: `Đã cập nhật ngành "${rawMajorName}" của ${school.shortName || school.code}.`,
      };
    } else {
      // ── Tạo chương trình mới ─────────────────────────────────────────────────
      let programId = `${school.id}-${major.id}`;
      if (allPrograms.some((p) => p.id === programId)) {
        programId = `${programId}-${slugify(admissionCode)}`;
      }
      const slug = `${major.slug}-${school.code.toLowerCase()}`;

      const initialCutoffs = scoreVal != null ? [{ year: targetYear, score: Math.round(scoreVal * 100) / 100 }] : [];
      const newProgram: Program = {
        id: programId,
        slug,
        schoolId: school.id,
        majorId: major.id,
        name: rawMajorName,
        admissionCode,
        trainingType: (input.trainingType as Program["trainingType"]) || "Chính quy",
        campus,
        combos: combos.length ? combos : ["A00", "D01"],
        cutoffs: initialCutoffs,
        altCutoffs: [],
        tuitionMin: tMin,
        tuitionMax: tMax >= tMin ? tMax : tMin,
        durationYears: 4,
        quota: quota > 0 ? quota : 100,
        competition: scoreVal && scoreVal >= 26 ? "Cao" : "Trung bình",
        methods: [
          {
            key: "thpt",
            name: "Xét điểm thi tốt nghiệp THPT",
            desc: "Theo điểm thi tốt nghiệp THPT.",
            requirement: scoreVal != null ? `${scoreVal} điểm` : "Chờ công bố",
            tag: "Điểm thi",
          },
        ],
        overview: `Chương trình ${rawMajorName} của ${school.name}.`,
        updatedAt: now().slice(0, 7),
        source: str(input.source, 200) || `Quản trị viên nhập (${targetYear})`,
        sourceUrl: null,
      };

      await repositories.catalogAdmin.createProgram(newProgram);
      await repositories.audit.append({
        id: randomUUID(),
        at: now(),
        actorId: actor.id,
        actorEmail: actor.email,
        programId,
        targetType: "program",
        action: "create",
        changes: [{ field: "Chương trình mới (Nhập tích hợp)", before: "—", after: `${admissionCode} · ${rawMajorName} – ${school.shortName}` }],
      });

      return {
        ok: true,
        action: "created" as const,
        programId,
        schoolId: school.id,
        majorId: major.id,
        isNewSchool,
        isNewMajor,
        hasScore: scoreVal != null,
        hasTuition: tMin > 0,
        message: `Đã thêm mới ngành "${rawMajorName}" vào ${school.shortName || school.code}.`,
      };
    }
  },

  /**
   * Sửa nhanh điểm và học phí trực tiếp (Quick In-Place Edit).
   */
  async quickUpdate(
    actor: PublicUser,
    programId: string,
    data: { score?: number | null; tuitionMin?: number | null; tuitionMax?: number | null; year?: number },
  ) {
    const program = await repositories.catalogAdmin.getProgram(programId);
    if (!program) return { ok: false, status: 404, message: "Không tìm thấy chương trình." } as const;

    const currentYear = new Date().getFullYear();
    const year = data.year && data.year >= 2020 ? data.year : currentYear;
    const patch: Partial<Program> = { updatedAt: now().slice(0, 7) };
    const changes: { field: string; before: string; after: string }[] = [];

    if (data.score !== undefined) {
      let cutoffs = [...program.cutoffs];
      if (data.score == null) {
        cutoffs = cutoffs.filter((c) => c.year !== year);
        changes.push({ field: `Điểm chuẩn ${year}`, before: String(program.cutoffs.find((c) => c.year === year)?.score ?? "—"), after: "Chưa công bố" });
      } else {
        const val = Math.round(Number(data.score) * 100) / 100;
        if (val < 0 || val > 30) return { ok: false, status: 400, message: "Điểm chuẩn phải từ 0 đến 30." } as const;
        cutoffs = [...cutoffs.filter((c) => c.year !== year), { year, score: val }].sort((a, b) => b.year - a.year);
        changes.push({ field: `Điểm chuẩn ${year}`, before: String(program.cutoffs.find((c) => c.year === year)?.score ?? "—"), after: String(val) });
      }
      patch.cutoffs = cutoffs;
    }

    if (data.tuitionMin !== undefined) {
      const tMin = data.tuitionMin == null ? 0 : Number(data.tuitionMin);
      const tMax = data.tuitionMax == null ? tMin : Number(data.tuitionMax);
      if (tMin < 0 || tMax < tMin) return { ok: false, status: 400, message: "Học phí không hợp lệ." } as const;
      patch.tuitionMin = tMin;
      patch.tuitionMax = tMax;
      changes.push({ field: "Học phí", before: `${program.tuitionMin}–${program.tuitionMax}`, after: `${tMin}–${tMax}` });
    }

    const existingOverride = (await repositories.programAdmin.getOverride(programId)) ?? {};
    await repositories.programAdmin.setOverride(programId, { ...existingOverride, ...patch }, {
      id: randomUUID(),
      at: now(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId,
      targetType: "program",
      action: "update",
      changes: changes.length ? changes : [{ field: "Sửa nhanh", before: "—", after: "Cập nhật" }],
    });

    return { ok: true, message: "Cập nhật thành công." };
  },

  /**
   * Lấy danh sách tổng hợp Trường · Ngành · Điểm · Học phí kèm cờ thiếu thông tin.
   */
  async listAll(filter?: { status?: "all" | "missing_score" | "missing_tuition" | "complete"; q?: string }): Promise<UnifiedRowItem[]> {
    const [schools, majors, programs] = await Promise.all([
      repositories.catalogAdmin.listSchools(),
      repositories.catalogAdmin.listMajors(),
      repositories.catalogAdmin.listPrograms(),
    ]);

    const schoolMap = new Map(schools.map((s) => [s.id, s]));
    const majorMap = new Map(majors.map((m) => [m.id, m]));
    const currentYear = new Date().getFullYear();

    const rows: UnifiedRowItem[] = programs.map((p) => {
      const school = schoolMap.get(p.schoolId);
      const major = majorMap.get(p.majorId);
      const latestCutoff = p.cutoffs?.[0] ?? null;
      const latestScore = latestCutoff ? latestCutoff.score : null;
      const latestYear = latestCutoff ? latestCutoff.year : currentYear;

      const missingScore = latestScore == null || latestScore <= 0;
      const missingTuition = !p.tuitionMin || p.tuitionMin <= 0;
      const isComplete = !missingScore && !missingTuition;

      return {
        id: p.id,
        schoolId: p.schoolId,
        schoolCode: school?.code ?? "—",
        schoolName: school?.name ?? "—",
        schoolCity: school?.city ?? "—",
        campus: p.campus || school?.campuses?.[0] || school?.city || "—",
        majorId: p.majorId,
        majorCode: major?.code ?? "—",
        majorName: p.name || major?.name || "—",
        admissionCode: p.admissionCode || "—",
        latestYear,
        latestScore,
        tuitionMin: p.tuitionMin ?? 0,
        tuitionMax: p.tuitionMax ?? 0,
        combos: p.combos ?? [],
        quota: p.quota ?? 0,
        missingScore,
        missingTuition,
        isComplete,
        updatedAt: p.updatedAt || "",
      };
    });

    // Lọc theo điều kiện
    let res = rows;
    if (filter?.status === "missing_score") {
      res = res.filter((r) => r.missingScore);
    } else if (filter?.status === "missing_tuition") {
      res = res.filter((r) => r.missingTuition);
    } else if (filter?.status === "complete") {
      res = res.filter((r) => r.isComplete);
    }

    if (filter?.q) {
      const qNorm = normalizeVi(filter.q.trim().toLowerCase());
      res = res.filter((r) =>
        normalizeVi(`${r.schoolCode} ${r.schoolName} ${r.majorName} ${r.admissionCode} ${r.schoolCity}`).toLowerCase().includes(qNorm),
      );
    }

    return res;
  },
};
