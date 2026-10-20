import { type NextRequest } from "next/server";
import { catalogService } from "@/services";

export async function GET(req: NextRequest) {
  const majorId = req.nextUrl.searchParams.get("majorId")?.trim() ?? "";
  if (!majorId || majorId.length > 100) {
    return Response.json({ error: "Ngành không hợp lệ" }, { status: 400 });
  }
  const items = await catalogService.getGoalPrograms(majorId);
  return Response.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
