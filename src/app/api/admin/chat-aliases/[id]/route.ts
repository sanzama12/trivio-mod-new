import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { chatbotService } from "@/services/chatbot.service";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const ok = await chatbotService.deleteAlias(user, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
