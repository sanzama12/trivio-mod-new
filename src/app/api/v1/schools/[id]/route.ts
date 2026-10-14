import { V1CatalogController } from "@/controllers/v1/catalog.controller";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return V1CatalogController.school(id);
}
