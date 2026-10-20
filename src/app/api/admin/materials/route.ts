import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {rateLimit} from '@/lib/rate-limit';
import {tooMany} from '@/lib/http';
import {MaterialError} from '@/domain/materials';
import {materialsService} from '@/services/materials.service';
import {MAX_PDF_BYTES} from '@/services/material-validation';
export const runtime='nodejs';

export async function POST(req:Request){
  const {user,error}=await requireAdmin();if(error)return error;
  const wait=rateLimit(`materials:${user.id}`,30,60);if(wait)return tooMany(wait);
  try{
    const max=MAX_PDF_BYTES+65536;
    if(Number(req.headers.get('content-length'))>max)throw new MaterialError('Dữ liệu quá lớn. PDF tối đa 10 MB.',413);
    const reader=req.body?.getReader();if(!reader)throw new MaterialError('Thiếu nội dung.');
    const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new MaterialError('Dữ liệu quá lớn. PDF tối đa 10 MB.',413);}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=Buffer.concat(chunks);
    let form:FormData;
    try{form=await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')??''}}).formData();}catch{throw new MaterialError('Biểu mẫu tải lên không hợp lệ.');}
    const payload=form.get('payload');if(typeof payload!=='string'||payload.length>16000)throw new MaterialError('Thiếu thông tin tài liệu.');
    let raw:Record<string,unknown>;try{raw=JSON.parse(payload);}catch{throw new MaterialError('Thông tin tài liệu không hợp lệ.');}
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new MaterialError('Thông tin tài liệu không hợp lệ.');
    const file=form.get('file');
    const upload=file instanceof File&&file.size?{bytes:new Uint8Array(await file.arrayBuffer()),name:file.name}:undefined;
    const item=await materialsService.save(user,raw,upload);
    return NextResponse.json({ok:true,item},{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){if(e instanceof MaterialError)return NextResponse.json({ok:false,message:e.message},{status:e.status});console.error('[materials]',e instanceof Error?e.message:e);return NextResponse.json({ok:false,message:'Chưa lưu được tài liệu. Vui lòng thử lại.'},{status:500});}
}
