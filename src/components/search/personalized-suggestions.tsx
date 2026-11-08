"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LuArrowRight, LuHeart, LuLoaderCircle, LuSparkles } from "react-icons/lu";
import type { MajorRecommendation } from "@/services/major-recommendation.service";
import { useTrovio } from "@/stores/trovio-store";
import { buttonClass } from "@/components/ui/button";

export function PersonalizedSuggestions({ query }: { query?: string }) {
  const store = useTrovio();
  const [items, setItems] = useState<MajorRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const strongSubjectIds = useMemo(() => {
    if (store.preferences?.strongSubjectIds.length) return store.preferences.strongSubjectIds;
    return Object.entries(store.profile?.scores ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }, [store.preferences?.strongSubjectIds, store.profile?.scores]);
  const groupIds = store.preferences?.groupIds.length ? store.preferences.groupIds : (store.profile?.groupIds ?? []);
  const interestMajorIds = store.preferences?.interestMajorIds.length ? store.preferences.interestMajorIds : (store.profile?.interestMajorIds ?? []);
  const useSavedBehavior = store.preferences?.useSavedBehavior ?? false;
  const behaviorProgramIds = useSavedBehavior ? Array.from(new Set([...store.saved, ...store.wishlist.map((item) => item.id)])) : [];
  const requestKey = JSON.stringify([query, groupIds, interestMajorIds, strongSubjectIds, useSavedBehavior, behaviorProgramIds]);
  const hasSignal = Boolean(query?.trim() || groupIds.length || interestMajorIds.length || strongSubjectIds.length || behaviorProgramIds.length);

  useEffect(() => {
    if (!store.hydrated || !hasSignal) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/major-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, groupIds, interestMajorIds, strongSubjectIds, useSavedBehavior, behaviorProgramIds, limit: 4 }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then((data: { items?: MajorRecommendation[] }) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch((error: unknown) => { if ((error as { name?: string }).name !== "AbortError") setItems([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // requestKey represents the complete, serialized recommendation input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.hydrated, hasSignal, requestKey]);

  const changeBehaviorConsent = (enabled: boolean) => {
    store.setRecommendationPreferences({
      groupIds,
      interestMajorIds,
      strongSubjectIds,
      useSavedBehavior: enabled,
      updatedAt: new Date().toISOString(),
    });
  };

  if (!store.hydrated || !hasSignal) return null;

  return <section className="mt-6 rounded-2xl border border-primary-200 bg-primary-50/70 p-4 sm:p-5" aria-busy={loading}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="flex items-center gap-2 text-sm font-semibold text-primary-800"><LuSparkles /> Gợi ý thêm cho bạn</p><p className="mt-1 text-xs text-slate-600">Kết hợp từ khóa đang tìm, ngành quan tâm và các môn có điểm cao trong hồ sơ.</p></div>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={useSavedBehavior} disabled={!store.saved.length && !store.wishlist.length} onChange={(event) => changeBehaviorConsent(event.target.checked)} className="size-4 accent-primary-700" /> Dùng mục đã lưu</label>
    </div>
    {loading ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><LuLoaderCircle className="animate-spin" /> Đang phân tích kết quả liên quan…</p> : items.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">
      {items.map((item) => <article key={item.major.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3"><span className="rounded-full bg-accent-100 px-2 py-1 text-xs font-semibold text-accent-800">{item.score}%</span><div className="min-w-0"><h3 className="font-bold text-slate-950">{item.major.name}</h3><p className="text-xs text-primary-700">{item.group.name}</p></div></div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 max-w-prose">{item.reasons.join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => store.toggleInterestedMajor(item.major.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600"><LuHeart className={store.isInterestedMajor(item.major.id) ? "fill-current" : ""} /> Quan tâm</button><Link href={`/nganh/${item.major.slug}`} className="text-xs font-semibold text-primary-700">Xem ngành</Link><Link href={`/chuong-trinh?majors=${encodeURIComponent(item.major.id)}`} className={buttonClass({ size: "sm", className: "ml-auto" })}>Tìm trường <LuArrowRight /></Link></div>
      </article>)}
    </div> : <p className="mt-4 text-sm text-slate-600">Chưa có gợi ý mở rộng phù hợp với từ khóa và hồ sơ hiện tại.</p>}
  </section>;
}
