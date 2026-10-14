import type { RiasecType } from "./types";

export const RIASEC_ORDER: RiasecType[] = ["R", "I", "A", "S", "E", "C"];

export const RIASEC_INFO: Record<RiasecType, { name: string; label: string; desc: string }> = {
  R: { name: "Realistic", label: "Thực tế", desc: "Thích làm việc với công cụ, máy móc, kỹ thuật cơ khí, tự nhiên ngoài trời." },
  I: { name: "Investigative", label: "Nghiên cứu", desc: "Thích quan sát, khám phá, phân tích dữ liệu, giải quyết các bài toán khó." },
  A: { name: "Artistic", label: "Nghệ thuật", desc: "Thích sáng tạo tự do, thiết kế, âm nhạc, văn học, không gò bó khuôn khổ." },
  S: { name: "Social", label: "Xã hội", desc: "Thích giúp đỡ, tư vấn, phát triển con người, tương tác chăm sóc cộng đồng." },
  E: { name: "Enterprising", label: "Doanh nhân", desc: "Thích lãnh đạo, thuyết phục, kinh doanh, tư duy chiến lược, đương đầu thử thách." },
  C: { name: "Conventional", label: "Quy củ", desc: "Thích tổ chức dữ liệu, quy trình, làm việc với các quy tắc rõ ràng." },
};

export const LIKERT_LABELS = ["Rất không thích", "Không thích", "Bình thường", "Thích", "Rất thích"] as const;
export const QUESTIONS_PER_PAGE = 5;
