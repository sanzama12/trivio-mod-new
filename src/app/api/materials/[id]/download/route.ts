import {repositories} from '@database/repositories';
import {rateLimit} from '@/lib/rate-limit';
import {clientIp,tooMany} from '@/lib/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const wait=rateLimit(`material-download:${clientIp(req)}`,60,60);if(wait)return tooMany(wait);
  const {id}=await params;
  if(!/^material-[a-f0-9-]{36}$/.test(id))return new Response('Không tìm thấy tài liệu.',{status:404});
  const file=await repositories.materials.download(id);
  if(!file)return new Response('Không tìm thấy tài liệu.',{status:404,headers:{'Cache-Control':'no-store'}});
  const filename=encodeURIComponent(file.filename).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(new Uint8Array(file.bytes),{headers:{
    'Content-Type':'application/pdf','Content-Length':String(file.bytes.length),
    'Content-Disposition':`attachment; filename="tai-lieu.pdf"; filename*=UTF-8''${filename}`,
    'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",
  }});
}
