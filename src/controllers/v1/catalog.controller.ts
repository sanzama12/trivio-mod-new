import type { NextRequest } from "next/server";
import { apiError, apiOk, withApiErrors } from "@/lib/api-response";
import { query } from "@/lib/db";
import { catalogService } from "@/services/catalog.service";
import { parseProgramFilters } from "@/services/program.filters";
import { programService } from "@/services/program.service";
import type { Region, SchoolType } from "@/domain/types";

const positiveInteger = (value: string | null, fallback: number, max = 100): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

export class V1CatalogController {
  static health(): Promise<Response> {
    return withApiErrors(async () => {
      await query("SELECT 1 AS ready");
      return apiOk({ status: "ready", database: "ready" });
    });
  }

  static schools(request: NextRequest): Promise<Response> {
    return withApiErrors(async () => {
      const params = request.nextUrl.searchParams;
      const page = positiveInteger(params.get("page"), 1);
      const limit = positiveInteger(params.get("limit"), 20);
      const result = await catalogService.searchSchools({
        q: params.get("q")?.trim() || undefined,
        region: (params.get("region") || undefined) as Region | undefined,
        type: (params.get("type") || undefined) as SchoolType | undefined,
        city: params.get("city")?.trim().toLowerCase() || undefined,
        page,
        limit,
      });
      return apiOk(result.items, { meta: { page, limit, total: result.total, totalPages: result.pageCount } });
    });
  }

  static majors(request: NextRequest): Promise<Response> {
    return withApiErrors(async () => {
      const params = request.nextUrl.searchParams;
      const page = positiveInteger(params.get("page"), 1);
      const limit = positiveInteger(params.get("limit"), 20);
      const items = await catalogService.listMajors({
        group: params.get("group") || undefined,
        q: params.get("q") || undefined,
        letter: params.get("letter") || undefined,
      });
      const data = items.slice((page - 1) * limit, page * limit);
      return apiOk(data, { meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) } });
    });
  }

  static programs(request: NextRequest): Promise<Response> {
    return withApiErrors(async () => {
      const raw = Object.fromEntries(request.nextUrl.searchParams);
      raw.pageSize = request.nextUrl.searchParams.get("limit") ?? raw.pageSize;
      const result = await programService.search(parseProgramFilters(raw));
      return apiOk(result.items, {
        meta: {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
          totalPages: result.pageCount,
          suggestions: result.suggestions,
        },
      });
    });
  }

  static program(idOrSlug: string): Promise<Response> {
    return withApiErrors(async () => {
      const result = await programService.getBySlug(idOrSlug);
      if (result) return apiOk(result);
      const [byId] = await programService.lookup([idOrSlug]);
      return byId ? apiOk(byId) : apiError(404, "NOT_FOUND", "Không tìm thấy chương trình.");
    });
  }

  static school(idOrSlug: string): Promise<Response> {
    return withApiErrors(async () => {
      const school = (await catalogService.listSchools()).find((item) => item.id === idOrSlug || item.slug === idOrSlug);
      return school ? apiOk(school) : apiError(404, "NOT_FOUND", "Không tìm thấy trường.");
    });
  }

  static major(idOrSlug: string): Promise<Response> {
    return withApiErrors(async () => {
      const majors = await catalogService.getMajors();
      const major = majors.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
      return major ? apiOk(major) : apiError(404, "NOT_FOUND", "Không tìm thấy ngành.");
    });
  }
}
