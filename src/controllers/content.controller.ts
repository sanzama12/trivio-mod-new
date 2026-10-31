import { materialsService } from '@/services/materials.service';
import { clientIp, tooMany } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

const MATERIAL_ID = /^material-[a-f0-9-]{36}$/;
const NOT_FOUND = 'Không tìm thấy tài liệu.';

export class ContentController {
  static async downloadMaterial(req: Request, id: string): Promise<Response> {
    const wait = rateLimit(`material-download:${clientIp(req)}`, 60, 60);
    if (wait) return tooMany(wait);
    if (!MATERIAL_ID.test(id)) return new Response(NOT_FOUND, { status: 404 });

    const file = await materialsService.download(id);
    if (!file) {
      return new Response(NOT_FOUND, {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const filename = encodeURIComponent(file.filename).replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(file.bytes.length),
        'Content-Disposition': `attachment; filename="tai-lieu.pdf"; filename*=UTF-8''${filename}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
      },
    });
  }
}
