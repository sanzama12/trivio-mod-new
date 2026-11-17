"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LuArrowRight, LuHeart, LuLoaderCircle, LuSparkles } from "react-icons/lu";
import type { MajorRecommendation } from "@/services/major-recommendation.service";
import { useTrovio } from "@/stores/trovio-store";
import { useBrowsingHistory } from "@/lib/browsing-history";
import { buttonClass } from "@/components/ui/button";
import { GroupIcon } from "@/components/ui/group-icon";

export function PersonalizedSuggestions({ query, limit = 4 }: { query?: string; limit?: number }) {
  const store = useTrovio();
  const browsing = useBrowsingHistory();
  const [items, setItems] = useState<MajorRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  const strongSubjectIds = useMemo(() => {
    if (store.preferences?.strongSubjectIds?.length) return store.preferences.strongSubjectIds;
    return Object.entries(store.profile?.scores ?? {})
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  }, [store.preferences?.strongSubjectIds, store.profile?.scores]);
  const groupIds = store.preferences?.groupIds?.length ? store.preferences.groupIds : (store.profile?.groupIds ?? []);
  const interestMajorIds = store.preferences?.interestMajorIds?.length ? store.preferences.interestMajorIds : (store.profile?.interestMajorIds ?? []);
  const interestIds = store.preferences?.interestIds ?? [];
  const useSavedBehavior = store.preferences?.useSavedBehavior ?? false;
  const behaviorProgramIds = useSavedBehavior ? Array.from(new Set([...store.saved, ...store.wishlist.map((item) => item.id)])) : [];
  const hasSignal = Boolean(store.riasec || query?.trim() || groupIds.length || interestMajorIds.length || interestIds.length || strongSubjectIds.length || behaviorProgramIds.length || browsing.views.length);
  const requestBody = JSON.stringify({
    query, groupIds, interestMajorIds, interestIds, strongSubjectIds, useSavedBehavior, behaviorProgramIds,
    riasec: store.riasec, useBrowsingBehavior: browsing.enabled, contentViews: browsing.views, limit,
  });

  useEffect(() => {
    if (!store.hydrated || !hasSignal) {
      setItems([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch("/api/major-recommendations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: requestBody, signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then((data: { items?: MajorRecommendation[] }) => {
        if (!controller.signal.aborted) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) { setItems([]); setFailed(true); }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [store.hydrated, hasSignal, requestBody, retry]);

  const changeSavedBehavior = (enabled: boolean) => {
    store.setRecommendationPreferences({
      ...store.preferences,
      groupIds, interestMajorIds, strongSubjectIds, interestIds,
      useSavedBehavior: enabled, updatedAt: new Date().toISOString(),
    });
  };

  if (!store.hydrated) return null;

  // Chỉ ẩn giao diện; giữ component được gắn để logic cá nhân hóa tiếp tục chạy.
  return (
    <section hidden className="mt-6 rounded-2xl border border-primary-200 bg-primary-50/60 p-4 sm:p-6" aria-label="Ngành phù hợp với bạn" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary-900"><LuSparkles aria-hidden />Ngành phù hợp với bạn</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">Kết hợp kết quả RIASEC, sở thích và môn thế mạnh. Nội dung liên quan đến những ngành, trường và chương trình bạn xem nhiều sẽ được ưu tiên thêm.</p>
        </div>
        <Link href="/trac-nghiem" className="text-sm font-semibold text-primary-700 hover:underline">{store.riasec ? "Xem kết quả RIASEC" : "Làm trắc nghiệm RIASEC"}</Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useSavedBehavior} onChange={(event) => changeSavedBehavior(event.target.checked)} className="size-4 accent-primary-700" />Dùng mục đã lưu
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={browsing.enabled} disabled={!browsing.allowed} onChange={(event) => browsing.setEnabled(event.target.checked)} className="size-4 accent-primary-700" />Cá nhân hóa theo lượt xem
        </label>
        {browsing.views.length > 0 && <button type="button" onClick={browsing.clear} className="font-semibold text-primary-700 hover:underline">Xóa lịch sử gợi ý</button>}
        {!browsing.allowed && <Link href="/chinh-sach-rieng-tu#cookie" className="underline underline-offset-4">Cho phép dùng lượt xem trong cài đặt quyền riêng tư</Link>}
      </div>
      <div aria-live="polite">
        {loading ? (
          <p className="mt-5 flex items-center gap-2 text-sm text-slate-600"><LuLoaderCircle className="size-4 animate-spin" aria-hidden />Đang tìm ngành liên quan…</p>
        ) : failed ? (
          <p className="mt-5 text-sm text-slate-600">Chưa tải được gợi ý. <button type="button" onClick={() => setRetry((value) => value + 1)} className="font-semibold text-primary-700 underline">Thử lại</button></p>
        ) : items.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.major.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3"><GroupIcon group={item.group} className="rounded-lg" /><div><p className="text-xs font-semibold text-primary-700">{item.group.name}</p><h3 className="mt-1 text-lg font-bold text-slate-950"><Link href={`/nganh/${item.major.slug}`} className="hover:text-primary-700">{item.major.name}</Link></h3></div></div>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-relaxed text-slate-600">{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                {item.careers.length > 0 && <p className="mt-3 text-sm text-slate-600">Nghề nghiệp tiêu biểu gồm {item.careers.slice(0, 3).join(", ")}.</p>}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                  <button type="button" aria-pressed={store.isInterestedMajor(item.major.id)} onClick={() => store.toggleInterestedMajor(item.major.id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700"><LuHeart aria-hidden className={store.isInterestedMajor(item.major.id) ? "fill-current" : ""} />Quan tâm</button>
                  <Link href={`/truong?majors=${encodeURIComponent(item.major.id)}`} className={buttonClass({ size: "sm", className: "ml-auto" })}>Tìm trường<LuArrowRight className="size-4" aria-hidden /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-relaxed text-slate-600">{hasSignal ? "Chưa tìm được ngành phù hợp từ dữ liệu hiện tại. Bạn có thể bổ sung sở thích hoặc môn thế mạnh trong hồ sơ." : "Hoàn thành trắc nghiệm RIASEC hoặc chọn ngành quan tâm để bắt đầu nhận gợi ý."}</p>
        )}
      </div>
    </section>
  );
}
