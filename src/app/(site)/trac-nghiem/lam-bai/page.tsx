import type { Metadata } from "next";
import { riasecService } from "@/services";
import { QuizRunner } from "@/components/riasec/quiz-runner";

export const metadata: Metadata = { title: "Làm bài trắc nghiệm" };

export default async function QuizPage() {
  const questions = await riasecService.getQuestions();
  return <QuizRunner questions={questions} />;
}
