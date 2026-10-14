import type { NextRequest } from "next/server";
import { V1CatalogController } from "@/controllers/v1/catalog.controller";

export function GET(request: NextRequest) {
  return V1CatalogController.schools(request);
}
