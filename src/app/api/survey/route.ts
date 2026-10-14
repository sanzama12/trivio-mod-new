import { CommunityController } from "@/controllers/community.controller";

/** POST /api/survey — uỷ quyền CommunityController */
export async function POST(req: Request) {
  return CommunityController.submitSurvey(req);
}
