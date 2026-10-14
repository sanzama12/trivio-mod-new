import { CommunityController } from "@/controllers/community.controller";

/** POST /api/qa/:id/answers — uỷ quyền CommunityController */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return CommunityController.answerQa(req, { id });
}
