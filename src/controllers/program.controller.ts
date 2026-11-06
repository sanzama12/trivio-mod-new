/**
 * CONTROLLER LAYER (MVC Architecture) — ProgramController
 * Xử lý tìm kiếm, lọc và xem chi tiết các chương trình đào tạo đại học.
 */
import { NextResponse, type NextRequest } from "next/server";
import { parseProgramFilters, programService } from "../services";

const PROGRAM_SEARCH_CACHE = {
  "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
};

const PROGRAM_DETAIL_CACHE = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
};

export class ProgramController {
  /**
   * Xử lý GET /api/programs
   */
  static async searchPrograms(req: NextRequest): Promise<Response> {
    const filters = parseProgramFilters(Object.fromEntries(req.nextUrl.searchParams));
    const result = await programService.search(filters);
    return NextResponse.json(result, { headers: PROGRAM_SEARCH_CACHE });
  }

  /**
   * Lấy chi tiết chương trình theo slug
   */
  static async getProgramBySlug(slug: string): Promise<Response> {
    const program = await programService.getBySlug(slug);
    if (!program) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy chương trình" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, program }, { headers: PROGRAM_DETAIL_CACHE });
  }
}
