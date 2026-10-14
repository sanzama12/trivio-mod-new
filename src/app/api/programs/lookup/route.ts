import { type NextRequest } from "next/server";
import { CatalogController } from "@/controllers/catalog.controller";

/** GET /api/programs/lookup?ids=a,b,c&score= — uỷ quyền CatalogController */
export async function GET(req: NextRequest) {
  return CatalogController.lookupPrograms(req);
}
