/**
 * CONTROLLER LAYER (MVC Architecture) — ProgramController
 * Xử lý tìm kiếm, lọc và xem chi tiết các chương trình đào tạo đại học.
 */
import { NextResponse, type NextRequest } from "next/server";
import { parseProgramFilters, programService } from "../services";

export class ProgramController {
  /**
   * Xử lý GET /api/programs
   */
  static async searchPrograms(req: NextRequest): Promise<Response> {
    const filters = parseProgramFilters(Object.fromEntries(req.nextUrl.searchParams));
    const result = await programService.search(filters);
    return NextResponse.json(result);
  }

  /**
   * Lấy chi tiết chương trình theo slug
   */
  static async getProgramBySlug(slug: string): Promise<Response> {
    const program = await programService.getBySlug(slug);
    if (!program) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy chương trình" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, program });
  }
}
