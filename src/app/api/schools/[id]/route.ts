import type { NextRequest } from 'next/server';
import { CatalogController } from '@/controllers/catalog.controller';

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  return CatalogController.getSchoolDetail(request, await params);
}
