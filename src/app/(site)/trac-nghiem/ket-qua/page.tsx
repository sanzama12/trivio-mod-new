import type { Metadata } from "next";
import { catalogService } from "@/services/catalog.service";
import { QuizResult } from "@/components/riasec/quiz-result";

export const metadata: Metadata = { title: "Kết quả trắc nghiệm RIASEC" };

export default async function QuizResultPage() {
  const majors = await catalogService.getMajors();
  return <QuizResult majors={majors.filter((major) => !major.hidden).map(({ id, slug, name, riasec, groupId }) => ({ id, slug, name, riasec, groupId }))} />;
}
