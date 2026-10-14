/**
 * SERVICE LAYER — việc làm & thu nhập theo ngành/trường.
 * Nguyên tắc: KHÔNG hiển thị con số nào không có nguồn; nguồn minh hoạ luôn được gắn nhãn;
 * số liệu quá 3 năm được đánh dấu "cũ".
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { DataSource, MajorOutcome, OutcomeMetric, PublicUser, SourceKind, TrustLevel } from "../domain/types";
import { repositories } from "../repositories";

export const TRUST_LABELS: Record<TrustLevel, string> = {
  cao: "Nguồn chính thức",
  "trung-binh": "Nguồn đáng tin – cần đối chiếu",
  "tham-khao": "Tham khảo",
  "minh-hoa": "Minh hoạ",
};

export const KIND_LABELS: Record<SourceKind, string> = {
  "van-ban": "Văn bản pháp luật",
  "thong-ke": "Thống kê nhà nước",
  "khao-sat-truong": "Khảo sát việc làm của trường",
  "bao-chi": "Báo chí dẫn khảo sát",
  "khao-sat-doanh-nghiep": "Khảo sát doanh nghiệp / tuyển dụng",
  "minh-hoa": "Số liệu minh hoạ",
};

/** Mức tin cậy suy ra từ loại nguồn (quản trị viên không tự nâng mức tin cậy). */
export const TRUST_BY_KIND: Record<SourceKind, TrustLevel> = {
  "van-ban": "cao",
  "thong-ke": "cao",
  "khao-sat-truong": "trung-binh",
  "bao-chi": "trung-binh",
  "khao-sat-doanh-nghiep": "tham-khao",
  "minh-hoa": "minh-hoa",
};

export const STALE_AFTER_YEARS = 3;
export const OUTCOME_FIELDS = ["employmentRate", "startingSalary", "experiencedSalary"] as const;
export type OutcomeField = (typeof OUTCOME_FIELDS)[number];
export const OUTCOME_FIELD_LABELS: Record<OutcomeField, string> = {
  employmentRate: "Tỷ lệ có việc làm trong 12 tháng",
  startingSalary: "Lương khởi điểm",
  experiencedSalary: "Thu nhập sau 3–5 năm",
};

export interface MetricView {
  metric: OutcomeMetric;
  source: DataSource;
  stale: boolean;
}

export interface MajorOutcomeView {
  majorId: string;
  employmentRate: MetricView | null;
  startingSalary: MetricView | null;
  experiencedSalary: MetricView | null;
  updatedAt: string;
  /** Chỉ toàn số liệu minh hoạ. */
  demoOnly: boolean;
}

const isStale = (year: number, now = new Date()) => now.getFullYear() - year > STALE_AFTER_YEARS;

function view(metric: OutcomeMetric | undefined, sources: Map<string, DataSource>): MetricView | null {
  if (!metric) return null;
  const source = sources.get(metric.sourceId);
  if (!source) return null; // không có nguồn → không hiển thị
  return { metric, source, stale: isStale(metric.year) };
}

function toView(o: MajorOutcome, sources: Map<string, DataSource>): MajorOutcomeView {
  const v = {
    majorId: o.majorId,
    employmentRate: view(o.employmentRate, sources),
    startingSalary: view(o.startingSalary, sources),
    experiencedSalary: view(o.experiencedSalary, sources),
    updatedAt: o.updatedAt,
  };
  const all = [v.employmentRate, v.startingSalary, v.experiencedSalary].filter((x): x is MetricView => !!x);
  return { ...v, demoOnly: all.length > 0 && all.every((m) => m.source.trust === "minh-hoa") };
}

type Fail = { ok: false; field: string; message: string };
const currentYear = () => new Date().getFullYear();

function validateMetric(field: OutcomeField, raw: unknown, sources: Map<string, DataSource>): { ok: true; metric: OutcomeMetric | undefined } | Fail {
  if (raw === null || raw === undefined) return { ok: true, metric: undefined };
  if (typeof raw !== "object") return { ok: false, field, message: "Dữ liệu không hợp lệ." };
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : Number(v));
  const value = num(r.value);
  const low = num(r.low);
  const high = num(r.high);
  const year = num(r.year);
  const sampleSize = num(r.sampleSize);
  const label = OUTCOME_FIELD_LABELS[field];
  if (value === undefined) return { ok: true, metric: undefined };
  const [min, max] = field === "employmentRate" ? [0, 100] : [0.5, 500];
  for (const [n, v] of [["Giá trị", value], ["Mức thấp", low], ["Mức cao", high]] as const) {
    if (v !== undefined && (!Number.isFinite(v) || v < min || v > max)) return { ok: false, field, message: `${label}: ${n} phải trong khoảng ${min}–${max}.` };
  }
  if (low !== undefined && low > value) return { ok: false, field, message: `${label}: mức thấp không được lớn hơn giá trị chính.` };
  if (high !== undefined && high < value) return { ok: false, field, message: `${label}: mức cao không được nhỏ hơn giá trị chính.` };
  if (!Number.isInteger(year) || year! < 2015 || year! > currentYear()) return { ok: false, field, message: `${label}: năm số liệu phải từ 2015 đến ${currentYear()}.` };
  const sourceId = String(r.sourceId ?? "");
  const source = sources.get(sourceId);
  if (!source) return { ok: false, field, message: `${label}: bắt buộc chọn nguồn dữ liệu.` };
  if (sampleSize !== undefined && (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 10_000_000)) {
    return { ok: false, field, message: `${label}: cỡ mẫu phải là số nguyên dương.` };
  }
  const note = r.note === undefined || r.note === null ? undefined : String(r.note).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 200) || undefined;
  const round = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 10) / 10);
  return { ok: true, metric: { value: round(value)!, low: round(low), high: round(high), year: year!, sourceId, sampleSize, note } };
}

const fmtMetric = (m: OutcomeMetric | undefined) =>
  m ? `${m.value}${m.low !== undefined && m.high !== undefined ? ` (${m.low}–${m.high})` : ""} · ${m.year} · ${m.sourceId}` : "—";

export const outcomeService = {
  async sourceMap(): Promise<Map<string, DataSource>> {
    return new Map((await repositories.outcomes.listSources()).map((s) => [s.id, s]));
  },

  async listSources(): Promise<DataSource[]> {
    return repositories.outcomes.listSources();
  },

  async benchmarks() {
    const [items, sources] = await Promise.all([repositories.outcomes.listBenchmarks(), this.sourceMap()]);
    return items.flatMap((b) => {
      const source = sources.get(b.sourceId);
      return source ? [{ ...b, source }] : [];
    });
  },

  async getMajor(majorId: string): Promise<MajorOutcomeView | null> {
    const [list, sources] = await Promise.all([repositories.outcomes.listMajorOutcomes(), this.sourceMap()]);
    const o = list.find((x) => x.majorId === majorId);
    return o ? toView(o, sources) : null;
  },

  /** Bảng tổng hợp cho trang /viec-lam. */
  async listMajors() {
    const [list, sources, majors, groups] = await Promise.all([
      repositories.outcomes.listMajorOutcomes(),
      this.sourceMap(),
      repositories.majors.findAll(),
      repositories.majors.findGroups(),
    ]);
    const byMajor = new Map(list.map((o) => [o.majorId, toView(o, sources)]));
    return majors
      .map((major) => ({ major, group: groups.find((g) => g.id === major.groupId)!, outcome: byMajor.get(major.id) ?? null }))
      .sort((a, b) => a.major.name.localeCompare(b.major.name, "vi"));
  },

  async getSchool(schoolId: string) {
    const [list, sources] = await Promise.all([repositories.outcomes.listSchoolOutcomes(), this.sourceMap()]);
    const o = list.find((x) => x.schoolId === schoolId);
    if (!o) return null;
    const salarySource = o.salaryNote ? sources.get(o.salaryNote.sourceId) : undefined;
    return {
      cohort: o.cohort ?? null,
      employmentRate: view(o.employmentRate, sources),
      salaryNote: o.salaryNote && salarySource ? { ...o.salaryNote, source: salarySource } : null,
    };
  },

  /** Quản trị: cập nhật số liệu một ngành — mỗi con số bắt buộc có nguồn. */
  async updateMajor(actor: PublicUser, majorId: string, input: Partial<Record<OutcomeField, unknown>>): Promise<{ ok: true; changes: number } | Fail> {
    const major = await repositories.majors.findById(majorId);
    if (!major) return { ok: false, field: "majorId", message: "Không tìm thấy ngành." };
    const sources = await this.sourceMap();
    const current = (await repositories.outcomes.listMajorOutcomes()).find((o) => o.majorId === majorId);
    const next: MajorOutcome = { majorId, updatedAt: new Date().toISOString().slice(0, 7) };
    const changes: { field: string; before: string; after: string }[] = [];
    for (const f of OUTCOME_FIELDS) {
      const raw = f in input ? input[f] : current?.[f];
      const v = validateMetric(f, raw, sources);
      if (!v.ok) return v;
      if (v.metric) next[f] = v.metric;
      const before = fmtMetric(current?.[f]);
      const after = fmtMetric(v.metric);
      if (before !== after) changes.push({ field: f, before, after });
    }
    if (changes.length === 0) return { ok: true, changes: 0 };
    await repositories.outcomes.setMajorOutcome(next);
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: majorId,
      targetType: "major-outcome",
      action: "update",
      changes,
    });
    return { ok: true, changes: changes.length };
  },

  async resetMajor(actor: PublicUser, majorId: string): Promise<boolean> {
    const had = await repositories.outcomes.resetMajorOutcome(majorId);
    if (had) {
      await repositories.audit.append({
        id: randomUUID(),
        at: new Date().toISOString(),
        actorId: actor.id,
        actorEmail: actor.email,
        programId: majorId,
        targetType: "major-outcome",
        action: "reset",
        changes: [{ field: "*", before: "Đã cập nhật", after: "Dữ liệu gốc" }],
      });
    }
    return had;
  },

  /** Quản trị: thêm nguồn. Mức tin cậy suy ra từ loại nguồn; bắt buộc có đường dẫn https. */
  async addSource(actor: PublicUser, input: Record<string, unknown>): Promise<{ ok: true; source: DataSource } | Fail> {
    const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
    const title = clean(input.title, 200);
    const publisher = clean(input.publisher, 100);
    const url = clean(input.url, 500);
    const note = clean(input.note, 400);
    const year = Number(input.year);
    const kind = input.kind as SourceKind;
    if (title.length < 5) return { ok: false, field: "title", message: "Tên nguồn cần ít nhất 5 ký tự." };
    if (publisher.length < 2) return { ok: false, field: "publisher", message: "Vui lòng ghi đơn vị công bố." };
    if (!Number.isInteger(year) || year < 2000 || year > currentYear()) return { ok: false, field: "year", message: `Năm công bố phải từ 2000 đến ${currentYear()}.` };
    if (!(kind in KIND_LABELS) || kind === "minh-hoa") return { ok: false, field: "kind", message: "Loại nguồn không hợp lệ." };
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      /* xử lý bên dưới */
    }
    if (!parsed || parsed.protocol !== "https:") return { ok: false, field: "url", message: "Cần đường dẫn https:// tới văn bản / báo cáo gốc." };
    if (note.length < 10) return { ok: false, field: "note", message: "Ghi rõ phạm vi, phương pháp hoặc cỡ mẫu (ít nhất 10 ký tự)." };
    const slug = title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const source: DataSource = {
      id: `${slug || "nguon"}-${randomBytes(3).toString("hex")}`,
      title,
      publisher,
      year,
      url: parsed.toString(),
      kind,
      trust: TRUST_BY_KIND[kind],
      note,
      accessedAt: new Date().toISOString().slice(0, 10),
    };
    await repositories.outcomes.addSource(source);
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: actor.id,
      actorEmail: actor.email,
      programId: source.id,
      targetType: "source",
      action: "update",
      changes: [{ field: "source", before: "—", after: `${source.title} (${source.publisher}, ${source.year})` }],
    });
    return { ok: true, source };
  },
};
