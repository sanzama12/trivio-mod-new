import type { Competition, Program } from "@/domain/types";

export function competitionOf(score?: number, quota?: number): Competition {
  if (score && score >= 25) return "Cao";
  if (score && score >= 20) return "Trung bình";
  if (quota && quota <= 50) return "Cao";
  return "Thấp";
}

export const programs: Program[] = [];
