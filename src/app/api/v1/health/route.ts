import { V1CatalogController } from "@/controllers/v1/catalog.controller";

export const dynamic = "force-dynamic";

export function GET() {
  return V1CatalogController.health();
}
