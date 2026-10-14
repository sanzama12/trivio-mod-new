import { type NextRequest } from "next/server";
import { CatalogController } from "@/controllers/catalog.controller";

/** GET /api/majors?group=&q=&letter=&page=&limit= — uỷ quyền CatalogController */
export async function GET(req: NextRequest) {
  return CatalogController.listMajors(req);
}
