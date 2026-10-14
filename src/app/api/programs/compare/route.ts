import { type NextRequest } from "next/server";
import { CatalogController } from "@/controllers/catalog.controller";

/** GET /api/programs/compare?ids=a,b,c&score=26.5 — tối đa 3 CTĐT, uỷ quyền CatalogController */
export async function GET(req: NextRequest) {
  return CatalogController.comparePrograms(req);
}
