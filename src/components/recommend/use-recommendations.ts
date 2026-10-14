"use client";

import { useEffect, useState } from "react";
import type { GoalSummary, Recommendation } from "@/services/recommendation.service";
import { profileScore } from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";

export interface RecState {
  items: Recommendation[] | null;
  goal: GoalSummary | null;
  missing: ("quiz" | "score")[];
  province: string | null;
  /** Điểm xét tuyển hiện hành của người dùng (theo phương thức của hồ sơ). */
  userScore: number | null;
  budgetMax: number | null;
  error: boolean;
}

/** Gọi /api/recommendations bằng dữ liệu trên máy (kết quả trắc nghiệm, hồ sơ điểm, mục tiêu). */
export function useRecommendations(limit = 6): RecState & { hasInput: boolean } {
  const { quiz, profile, goal, hydrated, user } = useTrovio();
  const [state, setState] = useState<RecState>({ items: null, goal: null, missing: [], province: null, userScore: null, budgetMax: null, error: false });
  const hasInput = !!(quiz || profile || goal?.majorId);
  const key = JSON.stringify([quiz?.result.completedAt, profile?.updatedAt, goal?.updatedAt, user?.id, limit]);

  useEffect(() => {
    if (!hydrated) return;
    if (!hasInput) {
      setState((s) => ({ ...s, items: [], goal: null }));
      return;
    }
    let cancelled = false;
    const score = profile ? profileScore(profile) : null;
    const budgetMax = profile?.budgetMax ?? goal?.budgetMax ?? null;
    fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riasec: quiz ? { percents: quiz.result.percents, code: quiz.result.code } : null,
        score: score && profile ? { method: score.method, total: score.total, combo: profile.combo } : null,
        budgetMax,
        regions: profile?.regions?.length ? profile.regions : (goal?.regions ?? []),
        groupIds: profile?.groupIds ?? [],
        goalMajorId: goal?.majorId ?? null,
        limit,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items: Recommendation[]; province: string | null; goal: GoalSummary | null; missing: ("quiz" | "score")[] }) => {
        if (cancelled) return;
        setState({ items: d.items ?? [], goal: d.goal ?? null, missing: d.missing ?? [], province: d.province, userScore: score?.total ?? null, budgetMax, error: false });
      })
      .catch(() => !cancelled && setState((s) => ({ ...s, items: [], error: true })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key, hasInput]);

  return { ...state, hasInput };
}
