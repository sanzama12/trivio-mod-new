import type { RiasecType } from "@/domain/types";
import { RIASEC_INFO } from "@/domain/riasec";
import { Badge } from "@/components/ui/badge";

// Tên class đầy đủ để Tailwind nhận diện các token nhóm khi build.
export const RIASEC_COLORS: Record<RiasecType, { text: string; bg: string }> = {
  R: { text: "text-riasec-r", bg: "bg-riasec-r" },
  I: { text: "text-riasec-i", bg: "bg-riasec-i" },
  A: { text: "text-riasec-a", bg: "bg-riasec-a" },
  S: { text: "text-riasec-s", bg: "bg-riasec-s" },
  E: { text: "text-riasec-e", bg: "bg-riasec-e" },
  C: { text: "text-riasec-c", bg: "bg-riasec-c" },
};

export function RiasecPill({ type }: { type: RiasecType }) {
  return <Badge tone="slate"><span className={RIASEC_COLORS[type].text}>{type}</span> · {RIASEC_INFO[type].label}</Badge>;
}
