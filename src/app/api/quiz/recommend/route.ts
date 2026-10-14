import { QuizController } from "@/controllers";

/** POST /api/quiz/recommend { percents, code } → ngành phù hợp nhất. */
export async function POST(req: Request) {
  return QuizController.recommendMajors(req);
}

