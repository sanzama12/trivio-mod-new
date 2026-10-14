import { NextResponse, type NextRequest } from "next/server";
import { repositories } from "@/repositories";

type Props = { params: Promise<{ id: string }> };

/**
 * GET /api/schools/:id
 * Lấy chi tiết một trường học theo ID hoặc Slug trực tiếp từ CSDL PostgreSQL.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const school = (await repositories.schools.findById(id)) || (await repositories.schools.findBySlug(id));

  if (!school) {
    return NextResponse.json({ error: "Không tìm thấy trường học" }, { status: 404 });
  }

  const programs = await repositories.programs.findBySchool(school.id);

  return NextResponse.json(
    { school, programs },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    }
  );
}
