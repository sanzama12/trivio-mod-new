import { type NextRequest } from "next/server";
import { CommunityController } from "@/controllers/community.controller";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/schools/[id]/reviews — uỷ quyền CommunityController */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return CommunityController.listReviews(req, { id });
}

/** POST /api/schools/[id]/reviews — uỷ quyền CommunityController */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return CommunityController.submitReview(req, { id });
}

/** DELETE /api/schools/[id]/reviews — uỷ quyền CommunityController */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return CommunityController.withdrawReview(req, { id });
}
