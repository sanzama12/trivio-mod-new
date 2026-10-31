import { type NextRequest } from "next/server";
import { CatalogController } from "@/controllers/catalog.controller";

/** GET /api/schools/compare?ids=school1,school2,school3,school4 */
export async function GET(req: NextRequest) {
  return CatalogController.compareSchools(req);
}
