import { CommunityController } from "@/controllers/community.controller";

/** GET /api/qa — uỷ quyền CommunityController */
export async function GET(req: Request) {
  return CommunityController.listQa(req);
}

/** POST /api/qa — uỷ quyền CommunityController */
export async function POST(req: Request) {
  return CommunityController.askQa(req);
}
