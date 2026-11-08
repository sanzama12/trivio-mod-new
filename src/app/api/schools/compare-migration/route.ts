import { NextRequest, NextResponse } from "next/server";
import { repositories } from "@database/repositories";

/** Classify legacy comparison IDs against the catalog; unknown IDs remain untouched. */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter((id) => /^[a-z0-9][a-z0-9-]{0,99}$/.test(id)).slice(0, 4);
  const [schools, programs] = await Promise.all([repositories.schools.findAll(), repositories.programs.findByIds(ids)]);
  const selected = new Set(ids);
  return NextResponse.json({ schools: schools.filter((s) => selected.has(s.id)).map((s) => s.id), programs: programs.map((p) => p.id) });
}
