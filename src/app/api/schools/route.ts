import { type NextRequest } from "next/server";
import { CatalogController } from "@/controllers/catalog.controller";

/** GET /api/schools?q=&region=&type=&city=&page=&limit= — uỷ quyền CatalogController */
export async function GET(req: NextRequest) {
  return CatalogController.searchSchools(req);
}
