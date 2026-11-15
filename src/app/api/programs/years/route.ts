import { NextResponse } from "next/server";
import { programYearService } from "@/services";

export const dynamic = "force-dynamic";

/** GET /api/programs/years?ids=a,b — trạng thái tuyển sinh, chỉ tiêu và học phí theo từng năm (dữ liệu công khai). */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return NextResponse.json({ years: await programYearService.listMany(ids) }, { headers: { "Cache-Control": "public, max-age=60" } });
}
