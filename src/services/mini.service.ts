/** Dữ liệu cho bản Mini: số câu, số chương trình và ngành gợi ý từ mã chia sẻ. */
import type { RiasecType } from "../domain/types";
import { repositories } from "../repositories";

export const miniService = {
  async overview(code: RiasecType[] | null) {
    const [questions, programs, majors] = await Promise.all([
      repositories.quiz.findQuestions(),
      repositories.programs.findAll(),
      code ? repositories.majors.findAll() : Promise.resolve([]),
    ]);
    const fit = code
      ? majors
          .map((m) => ({ m, s: m.riasec.reduce((n, t, i) => n + (code.includes(t) ? 3 - Math.abs(code.indexOf(t) - i) : 0), 0) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, 3)
          .map((x) => x.m.name)
      : [];
    return { fit, minutes: Math.max(3, Math.round((questions.length * 14) / 60)), questionCount: questions.length, programCount: programs.length };
  },
};
