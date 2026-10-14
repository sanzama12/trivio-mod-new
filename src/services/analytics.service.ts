/**
 * SERVICE LAYER — đo phễu hành vi ẩn danh + khảo sát SUS.
 *
 * Quyền riêng tư: chỉ lưu (ngày, tên sự kiện, mã ngẫu nhiên do trình duyệt tự tạo). Không lưu IP, tài khoản,
 * nội dung, URL. Trình duyệt bật "Do Not Track" / "Global Privacy Control" thì không gửi (xem lib/track.ts).
 */
import { randomUUID } from "node:crypto";
import { FUNNEL_EVENTS, type FunnelEvent, type SusResponse } from "../domain/types";
import { repositories } from "../repositories";
import { SUS_QUESTIONS, SUS_ROLES, susGrade, susScore } from "../domain/sus";

export { SUS_QUESTIONS, SUS_ROLES, susGrade, susScore };

export const FUNNEL_LABELS: Record<FunnelEvent, string> = {
  visit: "Vào web",
  quiz_done: "Làm xong trắc nghiệm",
  score_saved: "Nhập điểm",
  program_saved: "Lưu chương trình",
  wishlist_added: "Lập nguyện vọng",
  share_created: "Chia sẻ phụ huynh",
  chat_asked: "Hỏi trợ lý",
  quiz_started: "Bắt đầu trắc nghiệm",
  style_done: "Làm mini-test phong cách",
  mbti_added: "Nhập mã MBTI",
};

/** Thứ tự các bước của phễu chính (chat_asked là hành vi phụ, hiển thị riêng). */
export const FUNNEL_STEPS: FunnelEvent[] = ["visit", "quiz_done", "score_saved", "program_saved", "wishlist_added", "share_created"];

/** Ngày theo giờ Việt Nam (YYYY-MM-DD). */
export function vnDay(d = new Date()): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export const analyticsService = {
  /** Danh sách gốc cho xuất CSV ở route quản trị đã kiểm tra quyền. */
  async listSurveyResponses(): Promise<SusResponse[]> {
    return repositories.surveys.list();
  },

  async track(event: unknown, anonId: unknown): Promise<boolean> {
    if (typeof event !== "string" || !(FUNNEL_EVENTS as readonly string[]).includes(event)) return false;
    if (typeof anonId !== "string" || !/^[a-z0-9-]{8,40}$/i.test(anonId)) return false;
    await repositories.analytics.record(vnDay(), event as FunnelEvent, anonId.toLowerCase());
    return true;
  },

  async report(days = 30) {
    const to = vnDay();
    const from = vnDay(new Date(Date.now() - (days - 1) * 86400_000));
    const [summary, daily] = await Promise.all([repositories.analytics.summary(from, to), repositories.analytics.daily(from, to)]);
    const base = summary.visit || 0;
    const steps = FUNNEL_STEPS.map((e, i) => {
      const prev = i === 0 ? summary[e] : summary[FUNNEL_STEPS[i - 1]];
      return {
        event: e,
        label: FUNNEL_LABELS[e],
        users: summary[e],
        ofVisit: base ? Math.round((summary[e] / base) * 1000) / 10 : 0,
        fromPrev: prev ? Math.round((summary[e] / prev) * 1000) / 10 : 0,
      };
    });
    const quizRate = summary.quiz_started ? Math.round((Math.min(summary.quiz_done, summary.quiz_started) / summary.quiz_started) * 1000) / 10 : null;
    return { from, to, days, steps, chat: summary.chat_asked, quiz: { started: summary.quiz_started, done: summary.quiz_done, rate: quizRate }, style: summary.style_done, mbti: summary.mbti_added, daily };
  },

  async submitSurvey(input: Record<string, unknown>): Promise<{ ok: true; score: number; grade: string } | { ok: false; message: string }> {
    const answers = Array.isArray(input.answers) ? input.answers.map(Number) : [];
    if (answers.length !== 10 || answers.some((x) => !Number.isInteger(x) || x < 1 || x > 5)) {
      return { ok: false, message: "Vui lòng trả lời đủ 10 câu (1 = Rất không đồng ý … 5 = Rất đồng ý)." };
    }
    const role = typeof input.role === "string" && input.role in SUS_ROLES ? input.role : null;
    const comment =
      String(input.comment ?? "")
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
        .trim()
        .slice(0, 1000) || null;
    const score = susScore(answers);
    const r: SusResponse = { id: randomUUID(), at: new Date().toISOString(), answers, score, role, comment };
    await repositories.surveys.add(r);
    return { ok: true, score, grade: susGrade(score) };
  },

  async surveyReport() {
    const list = await repositories.surveys.list();
    const n = list.length;
    const mean = n ? Math.round((list.reduce((s, r) => s + r.score, 0) / n) * 10) / 10 : null;
    const sorted = [...list].map((r) => r.score).sort((a, b) => a - b);
    const median = n ? (n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2) : null;
    const sd = n > 1 && mean !== null ? Math.round(Math.sqrt(list.reduce((s, r) => s + (r.score - mean) ** 2, 0) / (n - 1)) * 10) / 10 : null;
    const perQuestion = SUS_QUESTIONS.map((q, i) => ({ q, mean: n ? Math.round((list.reduce((s, r) => s + r.answers[i], 0) / n) * 100) / 100 : null }));
    const byRole = Object.entries(SUS_ROLES).map(([k, label]) => {
      const rs = list.filter((r) => r.role === k);
      return { role: label, n: rs.length, mean: rs.length ? Math.round((rs.reduce((s, r) => s + r.score, 0) / rs.length) * 10) / 10 : null };
    });
    return {
      n,
      mean,
      median,
      sd,
      grade: mean !== null ? susGrade(mean) : null,
      perQuestion,
      byRole,
      comments: list.filter((r) => r.comment).slice(-20).reverse().map((r) => ({ at: r.at, score: r.score, comment: r.comment! })),
    };
  },
};
