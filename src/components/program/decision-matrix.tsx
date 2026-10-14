"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LuBookOpen, LuChartBar, LuLightbulb, LuMapPin, LuPuzzle, LuStar, LuWallet, LuArrowLeftRight } from "react-icons/lu";
import type { Region } from "@/domain/types";
import {
  DECISION_KEYS,
  DECISION_LABELS,
  DEFAULT_WEIGHTS,
  leadReasons,
  rankRows,
  sanitizeWeights,
  WEIGHT_PRESETS,
  WEIGHT_WORDS,
  type DecisionKey,
  type DecisionRow,
  type Weights,
} from "@/services/decision";
import { profileScore } from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { SchoolCode } from "./program-card";

const ICONS: Record<DecisionKey, typeof LuPuzzle> = { interest: LuPuzzle, admission: LuChartBar, tuition: LuWallet, distance: LuMapPin, career: LuBookOpen, reviews: LuStar };
const WEIGHT_KEY = "trovio:weights";
const DOT = (s: number) => (s >= 4 ? "bg-success-500" : s === 3 ? "bg-primary-600" : "bg-accent-500");

/** Ma trận quyết định có trọng số: học sinh tự đặt mức quan trọng, xếp hạng đổi ngay, có điểm thành phần. */
export function DecisionMatrix() {
  const { compare, wishlist, quiz, profile, goal, hydrated, reorderWishlist, addWishlist } = useTrovio();
  const toast = useToast();
  const [source, setSource] = useState<"compare" | "wishlist">("compare");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [data, setData] = useState<{ rows: DecisionRow[]; homeRegion: Region | null } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WEIGHT_KEY);
      if (raw) setWeights(sanitizeWeights(JSON.parse(raw)));
    } catch {
      /* bỏ qua */
    }
  }, []);
  useEffect(() => {
    if (hydrated && compare.length === 0 && wishlist.length > 0) setSource("wishlist");
  }, [hydrated, compare.length, wishlist.length]);
  const setW = (w: Weights) => {
    setWeights(w);
    try {
      window.localStorage.setItem(WEIGHT_KEY, JSON.stringify(w));
    } catch {
      /* bỏ qua */
    }
  };

  const ids = useMemo(() => (source === "compare" ? compare : wishlist.map((w) => w.id).slice(0, 6)), [source, compare, wishlist]);
  const idsKey = ids.join(",");
  useEffect(() => {
    if (!hydrated) return;
    if (!idsKey) {
      setData({ rows: [], homeRegion: null });
      return;
    }
    let cancelled = false;
    setData(null);
    fetch(`/api/decision?ids=${encodeURIComponent(idsKey)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setData({ rows: d.rows ?? [], homeRegion: d.homeRegion ?? null }))
      .catch(() => !cancelled && setData({ rows: [], homeRegion: null }));
    return () => {
      cancelled = true;
    };
  }, [hydrated, idsKey]);

  const ctx = useMemo(() => {
    const regions = profile?.regions ?? goal?.regions ?? [];
    return {
      riasec: quiz ? { percents: quiz.result.percents, code: quiz.result.code } : null,
      score: profile ? profileScore(profile) : null,
      budgetMax: profile?.budgetMax ?? goal?.budgetMax ?? null,
      homeRegion: data?.homeRegion ?? (regions.length === 1 ? regions[0] : null),
    };
  }, [quiz, profile, goal, data?.homeRegion]);

  const ranked = useMemo(() => (data ? rankRows(data.rows, ctx, weights) : []), [data, ctx, weights]);
  const order = [...ranked].sort((a, b) => a.rank - b.rank);
  const leader = order[0];
  const second = order[1];

  // Độ nhạy: đổi một trọng số ±2 có làm đổi chương trình dẫn đầu không?
  const flip = useMemo(() => {
    if (!data || !leader || !second) return null;
    for (const k of DECISION_KEYS) {
      for (const delta of [2, -2, 1, -1]) {
        const w = Math.max(0, Math.min(5, weights[k] + delta));
        if (w === weights[k]) continue;
        const r = rankRows(data.rows, ctx, { ...weights, [k]: w });
        const top = [...r].sort((a, b) => b.total - a.total)[0];
        if (top.row.programId !== leader.row.programId) return { key: k, w, name: `${top.row.name} – ${top.row.schoolName}`, total: top.total };
      }
    }
    return null;
  }, [data, ctx, weights, leader, second]);

  if (!hydrated || data === null) return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;

  const sourceToggle = (
    <div className="flex rounded-lg bg-slate-100 p-1 text-[13px] font-semibold" role="group" aria-label="Chọn danh sách để chấm">
      {(
        [
          ["compare", `Đang so sánh (${compare.length})`],
          ["wishlist", `Nguyện vọng (${Math.min(6, wishlist.length)})`],
        ] as const
      ).map(([k, label]) => (
        <button key={k} type="button" aria-pressed={source === k} onClick={() => setSource(k)} className={cn("rounded-md px-3 py-1.5", source === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}>
          {label}
        </button>
      ))}
    </div>
  );

  if (data.rows.length < 2) {
    return (
      <div className="space-y-4">
        {sourceToggle}
        <Card>
          <EmptyState
            icon={<LuArrowLeftRight />}
            title="Cần ít nhất 2 chương trình để chấm"
            description="Thêm chương trình vào So sánh (tối đa 3) hoặc vào danh sách nguyện vọng (dùng 6 nguyện vọng đầu)."
          >
            <Link href="/chuong-trinh" className={buttonClass()}>
              Tìm chương trình
            </Link>
          </EmptyState>
        </Card>
      </div>
    );
  }

  const applyOrder = () => {
    const sorted = order.map((r) => r.row.programId);
    if (source === "wishlist") {
      reorderWishlist(sorted);
      toast("Đã xếp lại nguyện vọng theo ma trận", "success");
    } else {
      sorted.forEach((id) => addWishlist(id));
      toast("Đã thêm vào nguyện vọng (chương trình đã có giữ nguyên vị trí)", "success");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
      <Card className="h-fit space-y-4 p-5">
        <h2 className="font-semibold text-slate-900">Trọng số của bạn</h2>
        <div className="flex flex-wrap gap-1.5">
          {WEIGHT_PRESETS.map((p) => {
            const on = DECISION_KEYS.every((k) => p.weights[k] === weights[k]);
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() => setW(p.weights)}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", on ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-300 text-slate-600 hover:border-primary-300")}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {DECISION_KEYS.map((k) => {
          const Icon = ICONS[k];
          return (
            <div key={k}>
              <div className="flex items-center gap-2 text-[13px]">
                <Icon className="size-3.5 text-slate-500" aria-hidden />
                <label htmlFor={`w-${k}`} className="flex-1 font-medium text-slate-700">
                  {DECISION_LABELS[k]}
                </label>
                <span className="text-xs font-bold text-primary-700">×{weights[k]}</span>
              </div>
              <input
                id={`w-${k}`}
                type="range"
                min={0}
                max={5}
                step={1}
                value={weights[k]}
                onChange={(e) => setW({ ...weights, [k]: Number(e.target.value) })}
                aria-valuetext={`${weights[k]} — ${WEIGHT_WORDS[weights[k]]}`}
                className="mt-1 w-full accent-primary-600"
              />
              <p className="text-[11px] text-slate-500">{WEIGHT_WORDS[weights[k]]}</p>
            </div>
          );
        })}
        <p className="text-xs text-slate-500">Tổng trọng số: {DECISION_KEYS.reduce((s, k) => s + weights[k], 0)} · điểm quy về thang 100.</p>
      </Card>

      <div className="min-w-0 space-y-4">
        {sourceToggle}
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <caption className="sr-only">Ma trận quyết định: điểm thành phần 1–5 và tổng có trọng số</caption>
            <thead>
              <tr className="bg-slate-50">
                <th scope="col" className="w-44 px-4 py-3 align-bottom text-[11px] font-semibold text-slate-500 uppercase">
                  Tiêu chí
                </th>
                {ranked.map((r) => (
                  <th key={r.row.programId} scope="col" className="px-3 py-3 align-bottom">
                    <div className={cn("rounded-lg p-2", r.rank === 1 && "bg-primary-50")}>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", r.rank === 1 ? "bg-primary-600 text-white" : "bg-slate-200 text-slate-700")}>#{r.rank}</span>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="hidden xl:block">
                          <SchoolCode code={r.row.schoolCode} />
                        </span>
                        <div className="min-w-0">
                          <Link href={`/chuong-trinh/${r.row.slug}`} className="block font-semibold text-slate-900 hover:text-primary-700">
                            {r.row.name}
                          </Link>
                          <span className="block text-[11px] font-normal text-primary-600">{r.row.schoolName}</span>
                        </div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DECISION_KEYS.map((k) => (
                <tr key={k} className="border-t border-slate-100">
                  <th scope="row" className="px-4 py-3 font-medium text-slate-700">
                    {DECISION_LABELS[k]} <span className="text-[11px] font-semibold text-slate-400">×{weights[k]}</span>
                  </th>
                  {ranked.map((r) => {
                    const rt = r.ratings[k];
                    return (
                      <td key={r.row.programId} className="px-3 py-3">
                        <div className="flex gap-1" aria-label={`${rt.score} trên 5`}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span key={i} className={cn("size-2.5 rounded-full", i <= rt.score ? (rt.missing ? "bg-slate-300" : DOT(rt.score)) : "bg-slate-200")} />
                          ))}
                        </div>
                        <p className={cn("mt-1 text-xs", rt.missing ? "text-slate-400 italic" : "text-slate-600")}>{rt.text}</p>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50">
                <th scope="row" className="px-4 py-3.5 font-bold text-slate-900">
                  Tổng có trọng số
                </th>
                {ranked.map((r) => (
                  <td key={r.row.programId} className="px-3 py-3.5">
                    <span className={cn("text-2xl font-bold", r.rank === 1 ? "text-primary-700" : "text-slate-900")}>{r.total}</span>
                    <span className="text-xs text-slate-500">/100</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>

        {leader && second && (
          <div className="flex gap-3 rounded-2xl border border-primary-200 bg-white p-4">
            <LuLightbulb className="mt-0.5 size-5 shrink-0 text-primary-600" aria-hidden />
            <div className="space-y-1 text-[13px]">
              <p className="font-semibold text-slate-900">
                {leader.row.name} – {leader.row.schoolName} dẫn đầu
                {(() => {
                  const why = leadReasons(leader, second, weights);
                  return why.length ? ` nhờ ${why.map((k) => DECISION_LABELS[k].toLowerCase()).join(" và ")}` : "";
                })()}
                .
              </p>
              <p className="text-slate-600">
                {second.row.name} – {second.row.schoolName} kém {leader.total - second.total} điểm.
                {flip ? ` Nếu đặt ${DECISION_LABELS[flip.key]} ×${flip.w}, ${flip.name} sẽ lên #1 (${flip.total} điểm).` : " Kết quả khá ổn định: đổi một trọng số ±2 không làm đổi vị trí dẫn đầu."}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={applyOrder}>{source === "wishlist" ? "Xếp lại nguyện vọng theo thứ tự này" : "Thêm vào nguyện vọng theo thứ tự này"}</Button>
          <Button variant="ghost" onClick={() => setW(DEFAULT_WEIGHTS)}>
            Đặt lại trọng số
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Điểm 1–5 mỗi ô do Trovio quy đổi từ dữ liệu (minh hoạ): sở thích theo % khớp RIASEC, khả năng trúng tuyển theo chênh lệch với điểm chuẩn, học phí so với ngân sách, gần nhà theo
          tỉnh/thành trong hồ sơ, việc làm theo lương khởi điểm của ngành, cảm nhận theo điểm trung bình (cần ≥ 3 cảm nhận). Ô xám = thiếu dữ liệu, tính mức trung tính 3. Phương pháp: cộng có
          trọng số (SAW) trong ra quyết định đa tiêu chí.
        </p>
      </div>
    </div>
  );
}
