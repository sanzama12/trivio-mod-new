import { DecisionController } from "@/controllers/decision.controller";

/** GET /api/decision?ids=a,b,c — uỷ quyền DecisionController (rate-limit 60/phút) */
export async function GET(req: Request) {
  return DecisionController.getDecisionRows(req);
}
