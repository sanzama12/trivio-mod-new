"use client";

import { useEffect, useMemo, useState } from "react";
import type { Region, School } from "@/domain/types";
import type { SchoolCompareItem } from "@/models/dtos";
import { MAX_COMPARE, useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";

export interface UseSchoolCompareOptions {
  initialSchools?: School[];
}

export function useSchoolCompare({ initialSchools = [] }: UseSchoolCompareOptions = {}) {
  const { compare, isSaved, toggleSaved, hydrated } = useTrovio();
  const toast = useToast();

  // Selected school IDs (2-4 schools)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [items, setItems] = useState<SchoolCompareItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Search states for adding more schools
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRegion, setSearchRegion] = useState<Region | "all">("all");
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Chart major filter
  const [selectedChartMajorId, setSelectedChartMajorId] = useState<string>("");

  // Initialize selected school IDs from store or initialSchools
  useEffect(() => {
    if (!hydrated) return;

    // Filter IDs from compare store that match school format
    const fromStore = compare.filter((id) => !id.startsWith("prog_") && id.length < 25);

    if (fromStore.length >= 2) {
      setSelectedIds(fromStore.slice(0, MAX_COMPARE));
    } else if (initialSchools.length >= 2) {
      setSelectedIds(initialSchools.slice(0, 3).map((s) => s.id));
    } else if (fromStore.length === 1 && initialSchools.length > 1) {
      const remaining = initialSchools.filter((s) => s.id !== fromStore[0]);
      setSelectedIds([fromStore[0], remaining[0].id]);
    } else if (initialSchools.length >= 2) {
      setSelectedIds(initialSchools.slice(0, 2).map((s) => s.id));
    }
  }, [hydrated, compare, initialSchools]);

  // Fetch school comparison details whenever selectedIds changes
  useEffect(() => {
    if (selectedIds.length === 0) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/schools/compare?ids=${selectedIds.join(",")}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { items?: SchoolCompareItem[] }) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => {
        if ((err as { name?: string }).name !== "AbortError") {
          setItems([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedIds]);

  // Search schools dynamically
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q && searchRegion === "all") {
      setSearchResults(initialSchools.slice(0, 8));
      return;
    }

    const controller = new AbortController();
    setSearching(true);

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (searchRegion !== "all") params.set("region", searchRegion);
    params.set("limit", "12");

    fetch(`/api/schools?${params.toString()}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { items?: School[] }) => {
        setSearchResults(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => {
        if ((err as { name?: string }).name !== "AbortError") {
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });

    return () => controller.abort();
  }, [searchQuery, searchRegion, initialSchools]);

  const handleAddSchool = (school: School) => {
    if (selectedIds.includes(school.id)) {
      toast(`${school.shortName || school.name} đã có trong danh sách so sánh`, "info");
      return;
    }
    if (selectedIds.length >= MAX_COMPARE) {
      toast(`Chỉ có thể so sánh tối đa ${MAX_COMPARE} trường cùng lúc`, "warning");
      return;
    }
    setSelectedIds((cur) => [...cur, school.id]);
    setIsAddOpen(false);
    toast(`Đã thêm ${school.shortName || school.name} vào so sánh`, "success");
  };

  const handleRemoveSchool = (schoolId: string, schoolName: string) => {
    setSelectedIds((cur) => cur.filter((id) => id !== schoolId));
    toast(`Đã bỏ ${schoolName} khỏi danh sách so sánh`, "info");
  };

  const handleToggleFavorite = (schoolId: string, schoolName: string) => {
    const added = toggleSaved(`school:${schoolId}`);
    toast(added ? `Đã lưu ${schoolName} vào danh sách yêu thích` : `Đã bỏ lưu ${schoolName}`, "success");
  };

  const handleClearAll = () => {
    setSelectedIds([]);
    toast("Đã làm trống danh sách so sánh", "info");
  };

  // Find all distinct majors across all compared schools
  const commonMajors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string; count: number }>();
    for (const item of items) {
      for (const m of item.majors) {
        if (!map.has(m.id)) {
          map.set(m.id, { id: m.id, name: m.name, code: m.code, count: 0 });
        }
        map.get(m.id)!.count += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  }, [items]);

  return {
    selectedIds,
    setSelectedIds,
    items,
    loading,
    searchQuery,
    setSearchQuery,
    searchRegion,
    setSearchRegion,
    searchResults,
    searching,
    isAddOpen,
    setIsAddOpen,
    selectedChartMajorId,
    setSelectedChartMajorId,
    handleAddSchool,
    handleRemoveSchool,
    handleToggleFavorite,
    handleClearAll,
    commonMajors,
    isSaved,
    hydrated,
    isSchoolSaved: (schoolId: string) => hydrated && isSaved(`school:${schoolId}`),
  };
}
