/**
 * SERVICE LAYER — mốc tuyển sinh & nhắc hạn.
 * Dữ liệu = lịch quản trị viên đã cập nhật (nếu có) ?? file cấu hình gốc `data/admission-timeline.ts` (minh hoạ).
 */
import { randomUUID } from "node:crypto";
import type { PublicUser, TimelineConfig, TimelineEvent } from "../domain/types";
import { repositories } from "../repositories";

import { programService } from './program.service';

export interface TimelineView {
  season: string;
  note: string;
  events: TimelineEvent[];
  /** true = quản trị viên đã xác nhận là lịch chính thức (kèm nguồn). */
  official: boolean;
  sourceUrl: string | null;
  updatedAt: string | null;
}

export const TIMELINE_CATEGORIES: Record<TimelineEvent["category"], string> = {
  thi: "Kỳ thi",
  "dang-ky": "Đăng ký",
  "ket-qua": "Kết quả",
  "nhap-hoc": "Nhập học",
  dgnl: "Đánh giá năng lực",
};

const TIMELINE_TTL_MS = 60 * 1000;
let timelineCache: { at: number; view: TimelineView } | null = null;

function rememberTimeline(view: TimelineView): TimelineView {
  timelineCache = { at: Date.now(), view };
  return view;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Ngày dạng YYYY-MM-DD có thật (JS tự "lăn" 30/02 thành 02/03 nên phải so lại chuỗi). */
const validDate = (s: unknown): s is string => {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);

type Fail = { ok: false; field: string; message: string };

export const timelineService = {
  /** Read-model cho trang kế hoạch B; gom dữ liệu ở Model thay vì để View gọi repository. */
  async getPlanBData() {
    const [views, majors, timeline, supplementaryRounds] = await Promise.all([
      programService.listAll(),
      repositories.majors.findAll(),
      this.list(),
      repositories.supplementary.list(),
    ]);
    return { views, majors, timeline, supplementaryRounds };
  },

  async list(): Promise<TimelineView> {
    if (timelineCache && Date.now() - timelineCache.at < TIMELINE_TTL_MS) return timelineCache.view;
    const cfg = await repositories.timelineConfig.get();
    if (cfg) {
      const events = [...cfg.events].sort((a, b) => a.start.localeCompare(b.start));
      return rememberTimeline({ season: cfg.season, note: cfg.note, events, official: cfg.official, sourceUrl: cfg.sourceUrl, updatedAt: cfg.updatedAt });
    }
    const events = await repositories.timeline.findAll();
    const season = events[0]?.start.slice(0, 4) ?? String(new Date().getFullYear());
    return rememberTimeline({ season, note: "Lịch tuyển sinh được đọc từ cơ sở dữ liệu.", events, official: false, sourceUrl: null, updatedAt: null });
  },

  /** Quản trị viên lưu lịch mới. Đánh dấu "chính thức" bắt buộc có link https tới văn bản của Bộ GD&ĐT/ĐHQG. */
  async save(admin: PublicUser, input: Record<string, unknown>): Promise<{ ok: true } | Fail> {
    const season = clean(input.season, 10);
    if (!/^20\d{2}$/.test(season)) return { ok: false, field: "season", message: "Mùa tuyển sinh là năm 4 chữ số, VD 2027." };
    const official = input.official === true;
    const sourceUrl = clean(input.sourceUrl, 500) || null;
    if (sourceUrl) {
      try {
        if (new URL(sourceUrl).protocol !== "https:") throw new Error();
      } catch {
        return { ok: false, field: "sourceUrl", message: "Đường dẫn nguồn phải bắt đầu bằng https://" };
      }
    }
    if (official && !sourceUrl) return { ok: false, field: "sourceUrl", message: "Lịch chính thức cần đường dẫn tới văn bản hướng dẫn của Bộ GD&ĐT / ĐHQG." };
    const note = clean(input.note, 300) || (official ? "Lịch theo hướng dẫn chính thức — xem nguồn." : "Lịch chưa được xác minh chính thức.");
    if (!Array.isArray(input.events) || input.events.length === 0 || input.events.length > 40) {
      return { ok: false, field: "events", message: "Cần từ 1 đến 40 mốc." };
    }
    const events: TimelineEvent[] = [];
    for (const [i, raw] of (input.events as Record<string, unknown>[]).entries()) {
      const title = clean(raw?.title, 120);
      const desc = clean(raw?.desc, 400);
      const category = raw?.category as TimelineEvent["category"];
      if (title.length < 3) return { ok: false, field: `events.${i}.title`, message: `Mốc ${i + 1}: tên mốc quá ngắn.` };
      if (!(category in TIMELINE_CATEGORIES)) return { ok: false, field: `events.${i}.category`, message: `Mốc ${i + 1}: loại mốc không hợp lệ.` };
      if (!validDate(raw?.start)) return { ok: false, field: `events.${i}.start`, message: `Mốc ${i + 1}: ngày bắt đầu không hợp lệ.` };
      const end = raw?.end ? raw.end : undefined;
      if (end !== undefined && (!validDate(end) || end < (raw.start as string))) {
        return { ok: false, field: `events.${i}.end`, message: `Mốc ${i + 1}: ngày kết thúc phải sau ngày bắt đầu.` };
      }
      const id = typeof raw?.id === "string" && /^[a-z0-9-]{3,60}$/.test(raw.id) ? raw.id : `${season}-${randomUUID().slice(0, 8)}`;
      if (events.some((e) => e.id === id)) return { ok: false, field: `events.${i}.id`, message: `Mốc ${i + 1}: trùng mã mốc.` };
      events.push({ id, title, start: raw.start as string, ...(end ? { end: end as string } : {}), category, desc });
    }
    const before = await this.list();
    const cfg: TimelineConfig = { season, official, sourceUrl, note, events, updatedAt: new Date().toISOString(), updatedBy: admin.id };
    await repositories.timelineConfig.set(cfg);
    timelineCache = null;
    await repositories.audit.append({
      id: randomUUID(),
      at: cfg.updatedAt,
      actorId: admin.id,
      actorEmail: admin.email,
      programId: `timeline-${season}`,
      targetType: "timeline",
      action: "update",
      changes: [
        { field: "season", before: before.season, after: season },
        { field: "official", before: before.official ? "Chính thức" : "Minh hoạ", after: official ? "Chính thức" : "Minh hoạ" },
        { field: "events", before: `${before.events.length} mốc`, after: `${events.length} mốc` },
      ],
    });
    return { ok: true };
  },

  async reset(admin: PublicUser): Promise<boolean> {
    const had = !!(await repositories.timelineConfig.get());
    if (!had) return false;
    await repositories.timelineConfig.set(null);
    timelineCache = null;
    await repositories.audit.append({
      id: randomUUID(),
      at: new Date().toISOString(),
      actorId: admin.id,
      actorEmail: admin.email,
      programId: "timeline",
      targetType: "timeline",
      action: "reset",
      changes: [{ field: "*", before: "Lịch đã cập nhật", after: "Lịch minh hoạ gốc" }],
    });
    return true;
  },
};
