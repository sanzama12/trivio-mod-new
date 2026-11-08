import type { Metadata } from "next";
import { QuizRunner } from "@/components/riasec/quiz-runner";

export const metadata: Metadata = { title: "Làm trắc nghiệm sở thích RIASEC" };

export default function QuizRunnerPage() {
  return <QuizRunner />;
}
