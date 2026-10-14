import type { Metadata } from "next";
import { QuizResultView } from "@/components/riasec/quiz-result";

export const metadata: Metadata = { title: "Kết quả trắc nghiệm" };

export default function QuizResultPage() {
  return <QuizResultView />;
}
