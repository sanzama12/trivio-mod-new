import { CatalogController } from "@/controllers/catalog.controller";

/** GET /api/programs/[slug] — uỷ quyền CatalogController */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return CatalogController.getProgramDetail(_req, { slug });
}
