import type { AdmissionMethod, Competition, Program, ProgramPatch } from "@/domain/types";

const METHOD_TEMPLATES: Record<string, Omit<AdmissionMethod, "requirement">> = {
  thpt: { key: "thpt", name: "Xét điểm thi tốt nghiệp THPT", desc: "Theo tổng điểm tổ hợp cộng điểm ưu tiên.", tag: "Điểm thi" },
  hocba: { key: "hocba", name: "Xét học bạ THPT", desc: "Theo kết quả học tập THPT và quy định của trường.", tag: "Học bạ" },
  "dgnl-hn": { key: "dgnl-hn", name: "Đánh giá năng lực ĐHQG Hà Nội", desc: "Theo điểm HSA và quy định của trường.", tag: "ĐGNL" },
  "dgnl-hcm": { key: "dgnl-hcm", name: "Đánh giá năng lực ĐHQG TP.HCM", desc: "Theo điểm ĐGNL và quy định của trường.", tag: "ĐGNL" },
  tsa: { key: "tsa", name: "Đánh giá tư duy Bách khoa Hà Nội", desc: "Theo điểm TSA và quy định của trường.", tag: "ĐGTD" },
};

function competitionOf(score?: number, quota?: number): Competition {
  if (score && score >= 25) return "Cao";
  if (score && score >= 20) return "Trung bình";
  if (quota && quota <= 50) return "Cao";
  return "Thấp";
}

/** Áp bản chỉnh sửa quản trị và giữ danh sách phương thức đồng bộ với điểm chuẩn. */
export function applyProgramPatch(program: Program, patch?: ProgramPatch | null): Program {
  if (!patch) return program;
  const next: Program = { ...program, ...patch };
  next.competition = competitionOf(next.cutoffs[0]?.score, next.quota);

  const available = new Set<string>([
    ...(next.cutoffs.length ? ["thpt"] : []),
    ...next.altCutoffs.map((cutoff) => cutoff.method),
  ]);
  // Khi import truyền danh sách phương thức rõ ràng, giữ cả phương thức chưa có điểm
  // để quản trị viên có thể bổ sung điểm sau. Luồng cũ vẫn tự đồng bộ theo cutoff.
  const methods = patch.methods
    ? [...patch.methods]
    : next.methods.filter((method) => !method.key || available.has(method.key));
  for (const key of available) {
    const template = METHOD_TEMPLATES[key];
    if (template && !methods.some((method) => method.key === key)) {
      methods.push({ ...template, requirement: "Theo điểm chuẩn và thông báo chính thức của trường" });
    }
  }
  next.methods = methods;
  return next;
}
