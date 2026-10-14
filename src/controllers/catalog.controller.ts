/**
 * CONTROLLER LAYER — CatalogController
 * Điểm vào duy nhất cho GET /api/schools, /api/majors, /api/programs/compare, /api/programs/lookup, /api/programs/[slug]
 * Nhiệm vụ: parse query, validate nhẹ, gọi catalogService/programService, trả NextResponse. Không chứa business rule.
 */
import { NextResponse, type NextRequest } from "next/server";
import { catalogService } from "@/services/catalog.service";
import { programService } from "@/services/program.service";
import type { Region, SchoolType } from "@/domain/types";

export class CatalogController {
  static async searchSchools(req: NextRequest): Promise<Response> {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() || undefined;
    const region = (sp.get("region")?.trim() || undefined) as Region | undefined;
    const type = (sp.get("type")?.trim() || undefined) as SchoolType | undefined;
    const city = sp.get("city")?.trim().toLowerCase() || undefined;
    const pageRaw = Number(sp.get("page"));
    const limitRaw = Number(sp.get("limit") || sp.get("pageSize"));
    return NextResponse.json(await catalogService.searchSchools({ q, region, type, city, page: pageRaw, limit: limitRaw }));
  }

  static async listMajors(req: NextRequest): Promise<Response> {
    const sp = req.nextUrl.searchParams;
    const pageRaw = Number(sp.get("page"));
    const limitRaw = Number(sp.get("limit") || sp.get("pageSize"));
    const all = await catalogService.listMajors({
      group: sp.get("group") ?? undefined,
      q: sp.get("q") ?? undefined,
      letter: sp.get("letter") ?? undefined,
    });
    const total = all.length;
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : 0;
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const items = limit > 0 ? all.slice((page - 1) * limit, page * limit) : all;
    return NextResponse.json({ items, total, page: limit > 0 ? page : 1, pageCount: limit > 0 ? Math.ceil(total / limit) : 1 });
  }

  static async comparePrograms(req: NextRequest): Promise<Response> {
    const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
    const score = Number(req.nextUrl.searchParams.get("score"));
    const items = await programService.getByIds(ids, Number.isFinite(score) && score > 0 ? score : null);
    return NextResponse.json({ items });
  }

  static async lookupPrograms(req: NextRequest): Promise<Response> {
    const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
    const score = Number(req.nextUrl.searchParams.get("score"));
    const items = await programService.lookup(ids, Number.isFinite(score) && score > 0 ? score : null);
    return NextResponse.json({ items });
  }

  static async getSchoolDetail(_req: Request, params: { id: string }): Promise<Response> {
    const detail = await catalogService.getSchoolDetail(params.id);
    if (!detail) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(detail, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' },
    });
  }

  static async getMajorDetail(_req: Request, params: { slug: string }): Promise<Response> {
    const detail = await catalogService.getMajorDetail(params.slug);
    if (!detail) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(detail, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' },
    });
  }

  static async getProgramDetail(_req: Request, params: { slug: string }): Promise<Response> {
    const detail = await programService.getBySlug(params.slug);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(detail);
  }
}
