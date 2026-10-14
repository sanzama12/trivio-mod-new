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
import type { Program, PublicUser, School, Major, SchoolType, RiasecType, MajorGroup } from "../domain/types";
import { PROVINCES, PROVINCE_REGION } from "../domain/provinces";
import { repositories } from "../repositories";
import { normalizeVi } from "../lib/text";
import { slugify } from "./catalog-admin.service";
import { defaultRiasecForGroup, findMajorForImport, inferMajorGroupId } from "./major-mapping.service";

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
  cutoffs?: { year: number; score: number }[]; // Điểm chuẩn các năm
  tuitionMin?: number | null; // Học phí tối thiểu triệu/năm
  tuitionMax?: number | null; // Học phí tối đa triệu/năm
  combos?: string[]; // Tổ hợp môn (VD: ["A00", "A01"])
  quota?: number | null; // Chỉ tiêu tuyển sinh
  trainingType?: string; // "Chính quy" | "Chất lượng cao" | ...
  source?: string; // Nguồn thông tin
}

export interface UnifiedEntryContext {
  schools: School[];
  majors: Major[];
  majorGroups?: MajorGroup[];
  programs: Program[];
  schoolsToSave?: School[];
  majorsToSave?: Major[];
  programsToInsert?: Program[];
  skipAudit?: boolean;
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
   * Hỗ trợ UnifiedEntryContext cho batch import cực nhanh không bị N+1 database roundtrips.
   */
  async save(actor: PublicUser, input: UnifiedEntryInput, ctx?: UnifiedEntryContext) {
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
    const allSchools = ctx ? ctx.schools : await repositories.catalogAdmin.listSchools();
    let school = allSchools.find((s) => s.code.toUpperCase() === rawCode);
    if (!school && input.schoolName) {
      const normInputSchoolName = normalizeVi(input.schoolName).toLowerCase();
      school = allSchools.find(
        (s) =>
          normalizeVi(s.name).toLowerCase() === normInputSchoolName ||
          normalizeVi(s.shortName).toLowerCase() === normInputSchoolName ||
          s.slug === slugify(input.schoolName!),
      );
    }
    let isNewSchool = false;

    const city = str(input.city, 40) || (school ? school.city : "Thành phố Hà Nội");
    const campusIn = str(input.campus, 160);

    if (!school) {
      isNewSchool = true;
      const schoolName = str(input.schoolName, 120) || `Trường Đại học ${rawCode}`;
      const shortName = schoolName.replace(/^Trường\s+/i, "").replace(/^Đại học/i, "ĐH");
      const region = PROVINCE_REGION[city as keyof typeof PROVINCE_REGION] ?? "bac";

      let baseSlug = slugify(schoolName) || slugify(rawCode);
      let schoolSlug = baseSlug;
      let slugCount = 2;
      while (allSchools.some((s) => s.slug === schoolSlug)) {
        schoolSlug = `${baseSlug}-${slugCount}`;
        slugCount++;
      }

      let schoolId = `sch-${slugify(rawCode)}`;
      let idCount = 2;
      while (allSchools.some((s) => s.id === schoolId)) {
        schoolId = `sch-${slugify(rawCode)}-${idCount}`;
        idCount++;
      }

      const newSchool: School = {
        id: schoolId,
        slug: schoolSlug,
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
      if (ctx?.schoolsToSave) ctx.schoolsToSave.push(newSchool);
      else await repositories.catalogAdmin.saveSchool(newSchool);
      if (ctx) ctx.schools.push(newSchool);
      if (!ctx?.skipAudit) {
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
      }
      school = newSchool;
    } else if (campusIn && !school.campuses.some((c) => c.toLowerCase() === campusIn.toLowerCase())) {
      // Bổ sung cơ sở mới vào trường nếu chưa có
      const updatedCampuses = [...school.campuses, campusIn].slice(0, 15);
      const changedSchool = { ...school, campuses: updatedCampuses };
      if (ctx?.schoolsToSave) {
        const queuedIndex = ctx.schoolsToSave.findIndex((item) => item.id === school!.id);
        if (queuedIndex >= 0) ctx.schoolsToSave[queuedIndex] = changedSchool;
        else ctx.schoolsToSave.push(changedSchool);
      } else {
        await repositories.catalogAdmin.saveSchool(changedSchool);
      }
      school.campuses = updatedCampuses;
    }

    // ── 2. Xử lý Ngành đào tạo ────────────────────────────────────────────────
    const allMajors = ctx ? ctx.majors : await repositories.catalogAdmin.listMajors();
    let rawMajorCode = str(input.majorCode, 20).trim();
    if (!rawMajorCode && input.admissionCode) {
      const admCandidate = str(input.admissionCode, 30).trim();
      const admMatch = admCandidate.match(/^(\d+)[-._\s]+([A-Z0-9]+)$/i);
      const cand = admMatch ? admMatch[2] : admCandidate;
      if (/^\d{7}$/.test(cand)) {
        rawMajorCode = cand;
      }
    }
    // Trích xuất mã ngành chuẩn nếu có đánh số chuyên ngành hẹp (VD: "1-7480201", "1 7480201", "1.7480201" -> "7480201")
    const baseCodeMatch = rawMajorCode.match(/^(\d+)[-._\s]+([A-Z0-9]+)$/i);
    const baseMajorCode = baseCodeMatch ? baseCodeMatch[2] : rawMajorCode;

    let major = findMajorForImport(allMajors, rawMajorName, baseMajorCode || rawMajorCode);
    let isNewMajor = false;

    if (!major) {
      isNewMajor = true;
      const groups = ctx?.majorGroups ?? await repositories.majors.findGroups();
      const finalMajorCode = baseMajorCode && /^\d{7}$/.test(baseMajorCode)
        ? baseMajorCode
        : rawMajorCode && /^\d{7}$/.test(rawMajorCode)
          ? rawMajorCode
          : `799${Math.floor(1000 + Math.random() * 9000)}`;

      let baseMajorSlug = slugify(rawMajorName);
      let majorSlug = baseMajorSlug;
      let majSlugCount = 2;
      while (allMajors.some((m) => m.slug === majorSlug)) {
        majorSlug = `${baseMajorSlug}-${majSlugCount}`;
        majSlugCount++;
      }

      let majorId = `maj-${slugify(rawMajorName)}`;
      let majIdCount = 2;
      while (allMajors.some((m) => m.id === majorId)) {
        majorId = `maj-${slugify(rawMajorName)}-${majIdCount}`;
        majIdCount++;
      }

      const newMajor: Major = {
        id: majorId,
        slug: majorSlug,
        code: finalMajorCode,
        name: rawMajorName,
        groupId: inferMajorGroupId(rawMajorName, finalMajorCode, groups),
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
      newMajor.riasec = defaultRiasecForGroup(newMajor.groupId);
      if (ctx?.majorsToSave) ctx.majorsToSave.push(newMajor);
      else await repositories.catalogAdmin.saveMajor(newMajor);
      if (ctx) ctx.majors.push(newMajor);
      if (!ctx?.skipAudit) {
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
      }
      major = newMajor;
    }

    // ── 3. Xử lý Chương trình, Điểm chuẩn & Học phí ────────────────────────────
    const allPrograms = ctx ? ctx.programs : await repositories.catalogAdmin.listPrograms();
    
    // Chuẩn hóa mã xét tuyển (hỗ trợ đánh số 1 2 3 trước mã ngành cho chuyên ngành hẹp)
    let rawAdmission = str(input.admissionCode, 30).trim();
    rawAdmission = rawAdmission.replace(/^\((\d+)\)\s*/, "$1-");
    rawAdmission = rawAdmission.replace(/^(\d+)[.)\s_-]+([a-zA-Z0-9]+)/, "$1-$2");
    let admissionCode = rawAdmission.toUpperCase().replace(/\s+/g, "-") ||
      (rawMajorCode ? rawMajorCode.replace(/\s+/g, "-").toUpperCase() : slugify(rawMajorName).toUpperCase());
    
    // Tìm chương trình đã có trong trường (khớp id hoặc khớp chính xác tên chương trình)
    const normInputName = normalizeVi(rawMajorName).toLowerCase();
    let existingProgram = input.id ? allPrograms.find((p) => p.id === input.id) : null;
    if (!existingProgram) {
      existingProgram = allPrograms.find((p) => p.schoolId === school.id && normalizeVi(p.name).toLowerCase() === normInputName) ?? null;
    }

    // Đảm bảo không vi phạm UNIQUE (school_id, admission_code) khi nhiều chuyên ngành hẹp dùng chung mã:
    // Nếu trong trường đã có chương trình mang mã này nhưng tên khác, tự động sinh mã phân biệt: 2-..., 3-...
    let finalAdmissionCode = admissionCode;
    let codeSuffix = 2;
    while (allPrograms.some((p) => p.schoolId === school.id && p.id !== existingProgram?.id && p.admissionCode && p.admissionCode.toUpperCase() === finalAdmissionCode.toUpperCase())) {
      finalAdmissionCode = `${codeSuffix}-${admissionCode.replace(/^\d+-/, "")}`;
      codeSuffix++;
    }

    const isDuplicate = Boolean(existingProgram && !input.id);

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
        admissionCode: finalAdmissionCode || existingProgram.admissionCode,
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

      const scoreNote = scoreVal != null ? `điểm chuẩn ${targetYear}: ${scoreVal}` : "giữ nguyên điểm chuẩn";
      return {
        ok: true,
        action: "updated" as const,
        isDuplicate,
        programId: existingProgram.id,
        schoolId: school.id,
        schoolName: school.name,
        schoolCode: school.code,
        majorName: rawMajorName,
        admissionCode: existingProgram.admissionCode,
        isNewSchool,
        isNewMajor,
        hasScore: scoreVal != null || updatedCutoffs.length > 0,
        hasTuition: tMin > 0,
        message: isDuplicate
          ? `Báo trùng ngành: Trường ${school.shortName || school.code} đã có ngành "${existingProgram.name}" (Mã: ${existingProgram.admissionCode}) → Đã cập nhật thành công ${scoreNote} & thông tin mới!`
          : `Đã cập nhật ngành "${rawMajorName}" của ${school.shortName || school.code}.`,
      };
    } else {
      // ── Tạo chương trình mới (hỗ trợ nhiều chuyên ngành hẹp) ─────────────────
      let programId = `${school.code.toLowerCase()}-${slugify(rawMajorName)}`;
      let idCounter = 2;
      while (allPrograms.some((p) => p.id === programId)) {
        programId = `${school.code.toLowerCase()}-${slugify(rawMajorName)}-${idCounter}`;
        idCounter++;
      }

      let slug = `${slugify(rawMajorName)}-${school.code.toLowerCase()}`;
      let slugCounter = 2;
      while (allPrograms.some((p) => p.slug === slug)) {
        slug = `${slugify(rawMajorName)}-${school.code.toLowerCase()}-${slugCounter}`;
        slugCounter++;
      }

      const initialCutoffs: { year: number; score: number }[] = [];
      if (Array.isArray(input.cutoffs) && input.cutoffs.length > 0) {
        for (const c of input.cutoffs) {
          if (c.score != null && c.score > 0 && c.score <= 30 && c.year >= 2000) {
            initialCutoffs.push({ year: c.year, score: Math.round(c.score * 100) / 100 });
          }
        }
      } else if (scoreVal != null && scoreVal > 0) {
        initialCutoffs.push({ year: targetYear, score: Math.round(scoreVal * 100) / 100 });
      }
      initialCutoffs.sort((a, b) => b.year - a.year);

      const newProgram: Program = {
        id: programId,
        slug,
        schoolId: school.id,
        majorId: major.id,
        name: rawMajorName,
        admissionCode: finalAdmissionCode,
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

      if (ctx?.programsToInsert) {
        ctx.programsToInsert.push(newProgram);
        ctx.programs.push(newProgram);
      } else {
        await repositories.catalogAdmin.createProgram(newProgram);
        if (ctx) ctx.programs.push(newProgram);
      }

      if (!ctx?.skipAudit) {
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
      }

      return {
        ok: true,
        action: "created" as const,
        isDuplicate: false,
        programId,
        schoolId: school.id,
        schoolName: school.name,
        schoolCode: school.code,
        majorName: rawMajorName,
        admissionCode,
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
  async getFormOptions() {
    const [schools, majors] = await Promise.all([
      repositories.catalogAdmin.listSchools(),
      repositories.catalogAdmin.listMajors(),
    ]);
    return { schools, majors };
  },

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
