import { NextResponse } from "next/server";
import { supplementaryService } from "@/services/supplementary.service";

/** GET /api/supplementary — các đợt xét tuyển bổ sung (minh hoạ) + chương trình liên quan (dữ liệu công khai). */
export async function GET() {
  return NextResponse.json(await supplementaryService.list());
}
