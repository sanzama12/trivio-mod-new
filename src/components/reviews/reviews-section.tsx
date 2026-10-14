"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LuBadgeCheck, LuFilterX, LuFlag, LuMessageSquarePlus, LuThumbsUp, LuTriangleAlert, LuX } from "react-icons/lu";
import type { ReviewCriterion, ReviewStatus } from "@/domain/types";
import { RELATION_LABELS, REPORT_REASONS, REVIEW_CRITERIA, REVIEW_FILTER_MIN, REVIEW_GUIDELINES, REVIEW_LIMITS, REVIEW_PAGE_SIZE, type ReportReason } from "@/domain/reviews";
import { formatDateVi } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useLoginGate } from "@/components/auth/login-gate";
import { useModal } from "@/components/ui/use-modal";
import { Stars, StarInput } from "./stars";

const CRITERIA = Object.keys(REVIEW_CRITERIA) as ReviewCriterion[];

export interface ReviewItem {
  id: string;
  authorName: string;
  relation: "sinh-vien" | "cuu-sinh-vien";
  cohort: number | null;
  majorName: string | null;
  ratings: Record<ReviewCriterion, number>;
  overall: number;
  title: string;
  content: string;
  createdAt: string;
  helpfulCount: number;
  viewerHelpful: boolean;
  schoolEmail: boolean;
  demo: boolean;
  mine: boolean;
}
export interface ReviewSummaryData {
  count: number;
  overall: number | null;
  byCriterion: Record<ReviewCriterion, number | null>;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
export type MyReview = ReviewItem & { status: ReviewStatus; rejectReason: string | null; anonymous: boolean; majorId: string | null };
export interface ReviewFacets {
  majors: { id: string; name: string; count: number }[];
  cohorts: { year: number; count: number }[];
}
export interface ReviewListData {
  summary: ReviewSummaryData;
  filtered: ReviewSummaryData | null;
  facets: ReviewFacets;
  items: ReviewItem[];
  mine: MyReview | null;
}

const STATUS_UI: Record<ReviewStatus, { label: string; cls: string }> = {
  pending: { label: "Đang chờ kiểm duyệt", cls: "bg-accent-50 text-accent-700" },
  approved: { label: "Đang hiển thị", cls: "bg-success-50 text-success-700" },
  rejected: { label: "Không được duyệt", cls: "bg-danger-50 text-danger-700" },
  hidden: { label: "Tạm ẩn — đang kiểm tra lại", cls: "bg-slate-100 text-slate-700" },
};

const emptyForm = () => ({
  relation: "sinh-vien" as "sinh-vien" | "cuu-sinh-vien",
  cohort: "",
  majorId: "",
  ratings: { teaching: 0, facilities: 0, activities: 0, career: 0 } as Record<ReviewCriterion, number>,
  title: "",
  content: "",
  anonymous: false,
});

export function ReviewsSection({
  schoolId,
  schoolName,
  majors,
  initial,
  viewer,
}: {
  schoolId: string;
  schoolName: string;
  majors: { id: string; name: string }[];
  initial: ReviewListData;
  viewer: { loggedIn: boolean; verified: boolean };
}) {
  const toast = useToast();
  const { requireLogin } = useLoginGate();
  const [data, setData] = useState(initial);
  const [sort, setSort] = useState<"moi-nhat" | "huu-ich">("moi-nhat");
  const [fMajor, setFMajor] = useState("");
  const [fCohort, setFCohort] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(REVIEW_PAGE_SIZE);
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndex = useRef<number | null>(null);
  const reqId = useRef(0);
  const uid = useId();
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useModal(formRef, formOpen, () => setFormOpen(false));
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");

  /** Tải lại danh sách theo sắp xếp + bộ lọc hiện tại; bỏ qua phản hồi cũ nếu người dùng đổi lọc liên tục. */
  const reload = async (opts: { sort?: typeof sort; major?: string; cohort?: string } = {}) => {
    const q = new URLSearchParams({ sort: opts.sort ?? sort });
    const major = opts.major ?? fMajor;
    const cohort = opts.cohort ?? fCohort;
    if (major) q.set("major", major);
    if (cohort) q.set("cohort", cohort);
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/schools/${encodeURIComponent(schoolId)}/reviews?${q}`);
      if (res.ok && id === reqId.current) {
        const d = await res.json();
        setData({ summary: d.summary, filtered: d.filtered ?? null, facets: d.facets ?? { majors: [], cohorts: [] }, items: d.items, mine: d.mine });
      }
    } catch {
      if (id === reqId.current) toast("Không tải được cảm nhận, vui lòng thử lại", "warning");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  const applyFilter = (next: { sort?: typeof sort; major?: string; cohort?: string }) => {
    if (next.sort !== undefined) setSort(next.sort);
    if (next.major !== undefined) setFMajor(next.major);
    if (next.cohort !== undefined) setFCohort(next.cohort);
    setVisible(REVIEW_PAGE_SIZE);
    void reload(next);
  };

  // "Xem thêm": đưa tiêu điểm bàn phím tới cảm nhận đầu tiên vừa hiện ra.
  useEffect(() => {
    if (focusIndex.current === null) return;
    const el = listRef.current?.children[focusIndex.current] as HTMLElement | undefined;
    focusIndex.current = null;
    el?.focus();
  }, [visible]);

  const openForm = () =>
    requireLogin({ title: "Đăng nhập để viết cảm nhận", reason: "Cảm nhận gắn với tài khoản đã xác thực email để hạn chế tin giả và spam." }, () => {
      if (!viewer.verified) return toast("Vui lòng xác thực email trước khi viết cảm nhận", "warning");
      const m = data.mine;
      setForm(
        m
          ? { relation: m.relation, cohort: m.cohort ? String(m.cohort) : "", majorId: m.majorId ?? "", ratings: m.ratings, title: m.title, content: m.content, anonymous: m.anonymous }
          : emptyForm(),
      );
      setError(null);
      setFormOpen(true);
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (CRITERIA.some((c) => !form.ratings[c])) return setError({ field: "ratings", message: "Vui lòng chấm đủ 4 tiêu chí." });
    setBusy(true);
    const res = await fetch(`/api/schools/${encodeURIComponent(schoolId)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cohort: form.cohort ? Number(form.cohort) : null, majorId: form.majorId || null }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.ok) return setError({ field: d.field, message: d.message ?? "Không gửi được, vui lòng thử lại." });
    setFormOpen(false);
    toast("Đã gửi cảm nhận — sẽ hiển thị sau khi được kiểm duyệt", "success");
    reload();
  };

  const withdraw = async () => {
    const res = await fetch(`/api/schools/${encodeURIComponent(schoolId)}/reviews`, { method: "DELETE" });
    if (res.ok) {
      toast("Đã rút lại cảm nhận", "info");
      reload();
    }
  };

  const helpful = (id: string) =>
    requireLogin({ title: "Đăng nhập để đánh giá", reason: "Mỗi tài khoản chỉ đánh dấu “Hữu ích” một lần cho mỗi cảm nhận." }, async () => {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}/helpful`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast(d.message ?? "Không thực hiện được", "warning");
      setData((x) => ({ ...x, items: x.items.map((r) => (r.id === id ? { ...r, viewerHelpful: d.helpful, helpfulCount: d.count } : r)) }));
    });

  const report = async (id: string) => {
    const res = await fetch(`/api/reviews/${encodeURIComponent(id)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason }),
    });
    const d = await res.json().catch(() => ({}));
    setReporting(null);
    if (!res.ok) return toast(d.message ?? "Không gửi được báo cáo", "warning");
    toast(d.hidden ? "Cảm nhận đã được tạm ẩn để kiểm tra lại" : "Cảm ơn bạn, đội kiểm duyệt sẽ xem xét", "success");
    if (d.hidden) reload();
  };

  const { summary, filtered, facets, items, mine } = data;
  const years = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i);
  const filterActive = !!(fMajor || fCohort);
  // Chỉ hiện bộ lọc khi trường đã có đủ cảm nhận và có ít nhất 2 lựa chọn để lọc.
  const showFilters = filterActive || (summary.count >= REVIEW_FILTER_MIN && (facets.majors.length >= 2 || facets.cohorts.length >= 2));
  const majorName = facets.majors.find((m) => m.id === fMajor)?.name;
  const shown = items.slice(0, visible);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="rounded-xl bg-slate-50 p-5 text-center">
          {summary.count > 0 && summary.overall != null ? (
            <>
              <p className="text-4xl font-extrabold text-slate-900">{summary.overall.toLocaleString("vi-VN")}</p>
              <Stars value={summary.overall} size="md" />
              <p className="mt-1 text-[13px] text-slate-500">{summary.count} cảm nhận đã kiểm duyệt</p>
            </>
          ) : (
            <p className="py-4 text-sm text-slate-500">Chưa có cảm nhận nào được duyệt.</p>
          )}
          <Button size="sm" className="mt-4" onClick={openForm}>
            <LuMessageSquarePlus className="size-4" aria-hidden /> {mine ? "Sửa cảm nhận của tôi" : "Viết cảm nhận"}
          </Button>
        </div>
        <dl className="space-y-3">
          {CRITERIA.map((c) => {
            const v = summary.byCriterion[c];
            return (
              <div key={c} className="grid grid-cols-[150px_1fr_36px] items-center gap-3 text-sm">
                <dt className="text-slate-600">{REVIEW_CRITERIA[c]}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-accent-500" style={{ width: `${((v ?? 0) / 5) * 100}%` }} />
                </dd>
                <dd className="text-right font-semibold text-slate-800">{v != null ? v.toLocaleString("vi-VN") : "—"}</dd>
              </div>
            );
          })}
          <p className="pt-1 text-xs text-slate-500">
            Cảm nhận là trải nghiệm cá nhân của người viết, đã qua kiểm duyệt nội dung nhưng không phải đánh giá chính thức của Trovio về {schoolName}.
          </p>
        </dl>
      </div>

      {mine && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Cảm nhận của bạn: “{mine.title}”</p>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_UI[mine.status].cls)}>{STATUS_UI[mine.status].label}</span>
          </div>
          {mine.status === "rejected" && mine.rejectReason && <p className="mt-1 text-[13px] text-danger-700">Lý do: {mine.rejectReason}. Bạn có thể sửa và gửi lại.</p>}
          <div className="mt-2 flex gap-3 text-[13px] font-semibold">
            <button type="button" onClick={openForm} className="text-primary-600 hover:underline">
              Sửa & gửi lại
            </button>
            <button type="button" onClick={withdraw} className="text-slate-500 hover:underline">
              Rút lại
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-bold text-slate-900">{filterActive ? "Cảm nhận theo bộ lọc" : "Cảm nhận gần đây"}</h3>
        <div className="flex flex-wrap items-end gap-2">
          {showFilters && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-major`} className="text-xs font-semibold text-slate-600">
                  Ngành
                </label>
                <select
                  id={`${uid}-major`}
                  value={fMajor}
                  onChange={(e) => applyFilter({ major: e.target.value })}
                  className="h-9 max-w-[14rem] rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-slate-800"
                >
                  <option value="">Tất cả ngành</option>
                  {facets.majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.count})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-cohort`} className="text-xs font-semibold text-slate-600">
                  Khoá (năm nhập học)
                </label>
                <select
                  id={`${uid}-cohort`}
                  value={fCohort}
                  onChange={(e) => applyFilter({ cohort: e.target.value })}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-slate-800"
                >
                  <option value="">Tất cả khoá</option>
                  {facets.cohorts.map((c) => (
                    <option key={c.year} value={c.year}>
                      Khoá {c.year} ({c.count})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-sort`} className="text-xs font-semibold text-slate-600">
              Sắp xếp
            </label>
            <select
              id={`${uid}-sort`}
              value={sort}
              onChange={(e) => applyFilter({ sort: e.target.value as "moi-nhat" | "huu-ich" })}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal text-slate-800"
            >
              <option value="moi-nhat">Mới nhất</option>
              <option value="huu-ich">Hữu ích nhất</option>
            </select>
          </div>
        </div>
      </div>

      {filterActive && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-900">
          <p role="status" aria-live="polite">
            <strong>{items.length}</strong>/{summary.count} cảm nhận
            {majorName ? ` · ngành ${majorName}` : ""}
            {fCohort ? ` · khoá ${fCohort}` : ""}
            {filtered?.overall != null && (
              <>
                {" "}
                · điểm trung bình nhóm này <strong>{filtered.overall.toLocaleString("vi-VN")}/5</strong>
                {summary.overall != null && <span className="text-primary-800"> (cả trường {summary.overall.toLocaleString("vi-VN")})</span>}
              </>
            )}
          </p>
          <button type="button" onClick={() => applyFilter({ major: "", cohort: "" })} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline">
            <LuFilterX className="size-4" aria-hidden /> Bỏ lọc
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          {filterActive ? "Chưa có cảm nhận nào khớp bộ lọc này. Thử chọn ngành hoặc khoá khác." : `Hãy là người đầu tiên chia sẻ trải nghiệm học tại ${schoolName}.`}
        </p>
      ) : (
        <ul ref={listRef} className={cn("space-y-4 transition-opacity", loading && "opacity-60")} aria-busy={loading || undefined}>
          {shown.map((r) => (
            <li key={r.id} tabIndex={-1} className="rounded-xl border border-slate-200 p-5 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-100">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.overall} />
                <span className="text-sm font-bold text-slate-900">{r.title}</span>
                {r.demo && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">Minh hoạ</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {r.authorName} · {RELATION_LABELS[r.relation]}
                {r.cohort ? ` khoá ${r.cohort}` : ""}
                {r.majorName ? ` · ${r.majorName}` : ""}
                {r.schoolEmail && (
                  <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-success-700">
                    <LuBadgeCheck className="size-3.5" aria-hidden /> Email trường
                  </span>
                )}
              </p>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-slate-700">{r.content}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                {CRITERIA.map((c) => (
                  <span key={c}>
                    {REVIEW_CRITERIA[c]}: <strong className="text-slate-700">{r.ratings[c]}/5</strong>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[13px]">
                <span className="text-slate-500">{formatDateVi(r.createdAt)}</span>
                {!r.mine && (
                  <button
                    type="button"
                    onClick={() => helpful(r.id)}
                    aria-pressed={r.viewerHelpful}
                    className={cn("inline-flex items-center gap-1 font-semibold", r.viewerHelpful ? "text-primary-700" : "text-slate-600 hover:text-primary-700")}
                  >
                    <LuThumbsUp className={cn("size-4", r.viewerHelpful && "fill-primary-100")} aria-hidden /> Hữu ích ({r.helpfulCount})
                  </button>
                )}
                {!r.mine &&
                  (reporting === r.id ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`rp-${r.id}`}>
                        Lý do báo cáo
                      </label>
                      <select id={`rp-${r.id}`} value={reportReason} onChange={(e) => setReportReason(e.target.value as ReportReason)} className="h-8 rounded-md border border-slate-300 px-2 text-xs">
                        {(Object.keys(REPORT_REASONS) as ReportReason[]).map((k) => (
                          <option key={k} value={k}>
                            {REPORT_REASONS[k]}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => report(r.id)} className="font-semibold text-danger-700 hover:underline">
                        Gửi báo cáo
                      </button>
                      <button type="button" onClick={() => setReporting(null)} className="text-slate-500 hover:underline">
                        Huỷ
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        requireLogin({ title: "Đăng nhập để báo cáo", reason: "Báo cáo gắn với tài khoản đã xác thực để tránh báo cáo giả mạo hàng loạt." }, () => {
                          if (!viewer.verified) return toast("Vui lòng xác thực email trước khi báo cáo", "warning");
                          setReporting(r.id);
                        })
                      }
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-danger-700"
                    >
                      <LuFlag className="size-3.5" aria-hidden /> Báo cáo
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > visible && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              focusIndex.current = visible;
              setVisible((v) => v + REVIEW_PAGE_SIZE);
            }}
          >
            Xem thêm {Math.min(REVIEW_PAGE_SIZE, items.length - visible)} cảm nhận (còn {items.length - visible})
          </Button>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={() => setFormOpen(false)}>
          <form
            ref={formRef}
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rv-title"
            className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-elevated sm:rounded-2xl"
            noValidate
          >
            <div className="flex items-center justify-between">
              <h2 id="rv-title" className="text-lg font-bold">
                Cảm nhận về {schoolName}
              </h2>
              <button type="button" onClick={() => setFormOpen(false)} className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <LuX className="size-5" />
              </button>
            </div>
            <details className="mt-3 rounded-lg bg-primary-50 p-3 text-[13px] text-primary-900" open>
              <summary className="cursor-pointer font-semibold">Quy tắc cộng đồng</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {REVIEW_GUIDELINES.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </details>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="rv-rel">Bạn là</Label>
                <select id="rv-rel" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value as typeof form.relation })} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm">
                  <option value="sinh-vien">Sinh viên</option>
                  <option value="cuu-sinh-vien">Cựu sinh viên</option>
                </select>
              </div>
              <div>
                <Label htmlFor="rv-cohort">Năm nhập học</Label>
                <select id="rv-cohort" value={form.cohort} onChange={(e) => setForm({ ...form, cohort: e.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm">
                  <option value="">Không nêu</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="rv-major">Ngành</Label>
                <select id="rv-major" value={form.majorId} onChange={(e) => setForm({ ...form, majorId: e.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm">
                  <option value="">Không nêu</option>
                  {majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 p-4">
              {CRITERIA.map((c) => (
                <StarInput key={c} name={`rv-${c}`} label={REVIEW_CRITERIA[c]} value={form.ratings[c]} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, [c]: v } })} />
              ))}
              {error?.field === "ratings" && <FieldError>{error.message}</FieldError>}
            </div>
            <div className="mt-4">
              <Label htmlFor="rv-t">Tiêu đề</Label>
              <Input id="rv-t" maxLength={REVIEW_LIMITS.titleMax} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} invalid={error?.field === "title"} placeholder="VD: Giảng viên nhiệt tình, học khá nặng" />
            </div>
            <div className="mt-4">
              <Label htmlFor="rv-c">Nội dung</Label>
              <textarea
                id="rv-c"
                rows={6}
                maxLength={REVIEW_LIMITS.contentMax}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                aria-invalid={error?.field === "content" || undefined}
                placeholder="Chương trình học, giảng viên, cơ sở vật chất, hoạt động, cơ hội thực tập…"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
              />
              <p className={cn("mt-1 text-right text-xs", form.content.trim().length < REVIEW_LIMITS.contentMin ? "text-slate-500" : "text-success-700")}>
                {form.content.trim().length}/{REVIEW_LIMITS.contentMax} (tối thiểu {REVIEW_LIMITS.contentMin})
              </p>
            </div>
            <Checkbox className="mt-2" label="Ẩn tên của tôi (hiển thị “Ẩn danh”)" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} />
            {error && error.field !== "ratings" && (
              <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-danger-700">
                <LuTriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error.message}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi để kiểm duyệt"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
