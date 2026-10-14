import { NextResponse, type NextRequest } from "next/server";
import { catalogService } from "@/services";
import { repositories } from "@/repositories";

type Props = { params: Promise<{ slug: string }> };

/**
 * GET /api/majors/:slug
 * Lấy chi tiết ngành đào tạo và danh sách các chương trình đào tạo của ngành trực tiếp từ CSDL.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const majorDetail = await catalogService.getMajorBySlug(slug);

  if (!majorDetail) {
    return NextResponse.json({ error: "Không tìm thấy ngành học" }, { status: 404 });
  }

  const programs = await repositories.programs.findByMajor(majorDetail.major.id);

  return NextResponse.json(
    { ...majorDetail, programs },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    }
  );
}
