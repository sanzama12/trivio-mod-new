import { CommunityController } from "@/controllers/community.controller";

/** POST /api/qa/:id/answers/:answerId — uỷ quyền CommunityController */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; answerId: string }> }) {
  const { id, answerId } = await params;
  return CommunityController.voteAnswer(req, { id, answerId });
}
