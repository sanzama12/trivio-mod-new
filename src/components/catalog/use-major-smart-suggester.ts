"use client";

import { useEffect, useMemo, useState } from "react";
import type { MajorRecommendation } from "@/models/dtos";
import { useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";

/**
 * CONTROLLER HOOK — Điều phối trạng thái & nghiệp vụ gợi ý ngành học thông minh
 * Tách biệt hoàn toàn tầng logic khỏi UI Presentational Component theo chuẩn MVC.
 */
export function useMajorSmartSuggester() {
  const store = useTrovio();
  const toast = useToast();

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<MajorRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "customize">("results");

  // Đồng bộ với hồ sơ cá nhân khi store khởi tạo xong
  useEffect(() => {
    if (!store.hydrated) return;
    const gIds = store.preferences?.groupIds?.length
      ? store.preferences.groupIds
      : store.profile?.groupIds ?? [];
    const sIds = store.preferences?.strongSubjectIds ?? [];

    setSelectedGroups(gIds);
    setSelectedSubjects(sIds);
  }, [store.hydrated, store.preferences, store.profile]);

  const toggleGroup = (id: string) => {
    setSelectedGroups((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  // Tự động gọi API gợi ý khi người dùng thay đổi nhóm ngành hoặc môn thế mạnh
  const queryPayload = useMemo(
    () => JSON.stringify({ groupIds: selectedGroups, strongSubjectIds: selectedSubjects }),
    [selectedGroups, selectedSubjects]
  );

  useEffect(() => {
    if (!store.hydrated) return;
    if (selectedGroups.length === 0 && selectedSubjects.length === 0) {
      setRecommendations([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch("/api/major-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupIds: selectedGroups,
        strongSubjectIds: selectedSubjects,
        limit: 6,
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { items?: MajorRecommendation[] }) => {
        setRecommendations(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError") {
          setRecommendations([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [store.hydrated, queryPayload]);

  const handleSaveToProfile = () => {
    store.setRecommendationPreferences({
      groupIds: selectedGroups,
      strongSubjectIds: selectedSubjects,
      interestMajorIds: store.preferences?.interestMajorIds ?? [],
      useSavedBehavior: true,
      academicPerformance: store.preferences?.academicPerformance ?? null,
      estimatedScore: store.preferences?.estimatedScore ?? null,
      estimatedCombo: store.preferences?.estimatedCombo ?? null,
      targetRegions: store.preferences?.targetRegions ?? [],
      budgetMax: store.preferences?.budgetMax ?? null,
      updatedAt: new Date().toISOString(),
    });
    toast("Đã lưu sở thích và môn thế mạnh vào hồ sơ", "success");
  };

  const handleToggleHeart = (majorId: string, majorName: string) => {
    const added = store.toggleInterestedMajor(majorId);
    toast(added ? `Đã thêm ${majorName} vào ngành quan tâm` : `Đã bỏ ${majorName} khỏi ngành quan tâm`, "success");
  };

  const isFavorite = (majorId: string) => store.hydrated && store.isInterestedMajor(majorId);

  const resetSelections = () => {
    setSelectedGroups([]);
    setSelectedSubjects([]);
  };

  return {
    selectedGroups,
    selectedSubjects,
    recommendations,
    loading,
    activeTab,
    setActiveTab,
    toggleGroup,
    toggleSubject,
    setSelectedGroups,
    setSelectedSubjects,
    resetSelections,
    handleSaveToProfile,
    handleToggleHeart,
    isFavorite,
    hasSelections: selectedGroups.length > 0 || selectedSubjects.length > 0,
  };
}
