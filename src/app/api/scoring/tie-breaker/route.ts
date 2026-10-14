import { ScoringController } from "@/controllers/scoring.controller";

export async function POST(req: Request) {
  return ScoringController.evaluateTieBreaker(req);
}
