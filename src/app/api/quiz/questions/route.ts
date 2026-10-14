import { QuizController } from "@/controllers";

export async function GET() {
  return QuizController.getQuestions();
}

