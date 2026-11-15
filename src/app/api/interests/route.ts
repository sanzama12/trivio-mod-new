import { NextResponse } from "next/server";
import { interestService } from "@/services";

export const dynamic = "force-dynamic";

/** GET /api/interests — danh sách sở thích và lĩnh vực nghề nghiệp để học sinh chọn. */
export async function GET() {
  const items = await interestService.listPublic();
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
