"use client";

import { useMemo, useState } from "react";
import type { SchoolCompareItem } from "@/services/catalog.service";
import { cn } from "@/lib/cn";

export interface SchoolCutoffChartProps {
  schools: SchoolCompareItem[];
  selectedMajorId?: string;
}

const SCHOOL_COLORS = [
  { stroke: "#2563EB", fill: "#3B82F6", light: "bg-blue-50 text-blue-700 border-blue-200" }, // Blue
  { stroke: "#059669", fill: "#10B981", light: "bg-emerald-50 text-emerald-700 border-emerald-200" }, // Emerald
  { stroke: "#D97706", fill: "#F59E0B", light: "bg-amber-50 text-amber-700 border-amber-200" }, // Amber
  { stroke: "#7C3AED", fill: "#8B5CF6", light: "bg-purple-50 text-purple-700 border-purple-200" }, // Violet
];

export function SchoolCutoffChart({ schools, selectedMajorId }: SchoolCutoffChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    schoolName: string;
    year: number;
    score: number;
    x: number;
    y: number;
  } | null>(null);

  // Extract all available years across all schools (sorted ascending)
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    for (const item of schools) {
      if (selectedMajorId) {
        const prog = item.programs.find((p) => p.majorId === selectedMajorId);
        for (const c of prog?.cutoffs || []) {
          yearSet.add(c.year);
        }
      } else {
        for (const c of item.cutoffsByYear) {
          yearSet.add(c.year);
        }
      }
    }
    const arr = Array.from(yearSet).sort((a, b) => a - b);
    return arr;
  }, [schools, selectedMajorId]);

  // Compute points for each school
  const seriesData = useMemo(() => {
    return schools.map((item, schoolIndex) => {
      const color = SCHOOL_COLORS[schoolIndex % SCHOOL_COLORS.length];
      const points: { year: number; score: number }[] = [];

      for (const y of years) {
        if (selectedMajorId) {
          const prog = item.programs.find((p) => p.majorId === selectedMajorId);
          const c = prog?.cutoffs?.find((co) => co.year === y);
          if (c && typeof c.score === "number" && c.score > 0) {
            points.push({ year: y, score: c.score });
          }
        } else {
          const c = item.cutoffsByYear.find((co) => co.year === y);
          if (c && typeof c.avgScore === "number" && c.avgScore > 0) {
            points.push({ year: y, score: c.avgScore });
          }
        }
      }

      return {
        school: item.school,
        color,
        points,
      };
    });
  }, [schools, selectedMajorId, years]);

  // Find min and max score for scaling
  const allScores = useMemo(() => {
    const scores: number[] = [];
    for (const s of seriesData) {
      for (const p of s.points) {
        scores.push(p.score);
      }
    }
    return scores;
  }, [seriesData]);

  if (allScores.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">
          Chưa có đủ dữ liệu điểm chuẩn các năm để dựng biểu đồ cho lựa chọn này.
        </p>
      </div>
    );
  }

  const rawMin = Math.min(...allScores);
  const rawMax = Math.max(...allScores);
  const minScore = Math.max(10, Math.floor(rawMin - 1));
  const maxScore = Math.min(30, Math.ceil(rawMax + 1));

  // Chart dimensions (SVG viewBox)
  const width = 640;
  const height = 260;
  const paddingLeft = 55;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (year: number) => {
    if (years.length <= 1) return paddingLeft + chartWidth / 2;
    const index = years.indexOf(year);
    return paddingLeft + (index / (years.length - 1)) * chartWidth;
  };

  const getY = (score: number) => {
    if (maxScore === minScore) return paddingTop + chartHeight / 2;
    return paddingTop + chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;
  };

  // Generate 4 horizontal gridlines
  const yTicks = [
    minScore,
    Math.round(((minScore + (maxScore - minScore) * 0.33) * 10) / 10),
    Math.round(((minScore + (maxScore - minScore) * 0.66) * 10) / 10),
    maxScore,
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {selectedMajorId ? "Xu hướng điểm chuẩn ngành qua các năm" : "Điểm chuẩn trung bình toàn trường qua các năm"}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Thang điểm 30 phương thức xét điểm thi THPT {years.length > 0 && `(${years[0]} – ${years[years.length - 1]})`}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
          {seriesData.map((s) => (
            <div key={s.school.id} className="flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ backgroundColor: s.color.stroke }} />
              <span className="text-slate-700">{s.school.shortName || s.school.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Biểu đồ SVG */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 w-full overflow-visible select-none"
          role="img"
          aria-label="Biểu đồ so sánh điểm chuẩn các trường qua các năm"
        >
          {/* Lưới ngang & Nhãn trục Y */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--color-slate-200)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-xs font-semibold"
                >
                  {tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Nhãn trục X (Năm) */}
          {years.map((y) => {
            const x = getX(y);
            return (
              <g key={y}>
                <line
                  x1={x}
                  y1={height - paddingBottom}
                  x2={x}
                  y2={height - paddingBottom + 5}
                  stroke="var(--color-slate-400)"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 20}
                  textAnchor="middle"
                  className="fill-slate-600 text-xs font-semibold"
                >
                  {y}
                </text>
              </g>
            );
          })}

          {/* Đường đồ thị từng trường */}
          {seriesData.map((s) => {
            if (s.points.length === 0) return null;

            // Generate SVG path 'd' attribute
            const sortedPoints = [...s.points].sort((a, b) => a.year - b.year);
            const pathD = sortedPoints.reduce((acc, curr, idx) => {
              const x = getX(curr.year);
              const y = getY(curr.score);
              return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
            }, "");

            return (
              <g key={s.school.id}>
                {/* Đường nối */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color.stroke}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />

                {/* Các điểm mốc */}
                {sortedPoints.map((p) => {
                  const px = getX(p.year);
                  const py = getY(p.score);
                  const isHovered =
                    hoveredPoint?.schoolName === (s.school.shortName || s.school.name) &&
                    hoveredPoint?.year === p.year;

                  return (
                    <g
                      key={p.year}
                      className="cursor-pointer"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          schoolName: s.school.shortName || s.school.name,
                          year: p.year,
                          score: p.score,
                          x: px,
                          y: py,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Vòng tròn điểm */}
                      <circle
                        cx={px}
                        cy={py}
                        r={isHovered ? 7 : 5}
                        fill="#FFFFFF"
                        stroke={s.color.stroke}
                        strokeWidth={isHovered ? 3.5 : 2.5}
                        className="transition-all"
                      />

                      {/* Nhãn điểm chuẩn trên đỉnh mốc */}
                      <text
                        x={px}
                        y={py - 10}
                        textAnchor="middle"
                        className={cn(
                          "text-xs font-semibold transition-all",
                          isHovered ? "fill-slate-950 scale-110" : "fill-slate-700"
                        )}
                      >
                        {p.score.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip khi rê chuột vào điểm */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-transform"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 14}%`,
            }}
          >
            <span className="text-amber-300 font-bold">{hoveredPoint.schoolName}</span> · Năm {hoveredPoint.year}:{" "}
            <strong>{hoveredPoint.score.toFixed(2)} điểm</strong>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5">
        <span>* Điểm số lấy theo đề án tuyển sinh chính thức từng năm của các trường.</span>
        <span>Rê chuột vào điểm để xem chi tiết</span>
      </div>
    </div>
  );
}
