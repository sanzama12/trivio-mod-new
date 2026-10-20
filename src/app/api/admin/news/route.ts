import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { jsonBody,tooMany } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { NewsError } from '@/domain/news';
import { newsService } from '@/services/news.service';

export async function POST(req:Request) {
  const {user,error}=await requireAdmin();
  if(error)return error;
  const wait=rateLimit(`news-write:${user.id}`,60,60);
  if(wait)return tooMany(wait);
  const parsed=await jsonBody<Record<string,unknown>>(req,256*1024);
  if(parsed.error)return parsed.error;
  if(!parsed.body || typeof parsed.body!=='object' || Array.isArray(parsed.body))return NextResponse.json({ok:false,message:'JSON không hợp lệ.'},{status:400});
  try {
    const post=await newsService.save(user,parsed.body);
    return NextResponse.json({ok:true,id:post.id,version:post.version,slug:post.slug,status:post.status,publishedAt:post.publishedAt},{headers:{'Cache-Control':'private, no-store'}});
  } catch(e) {
    if(e instanceof NewsError)return NextResponse.json({ok:false,message:e.message,field:e.field},{status:e.status});
    console.error('[news] save failed',e instanceof Error?e.message:'unknown');
    return NextResponse.json({ok:false,message:'Chưa lưu được bài viết. Vui lòng thử lại.'},{status:500});
  }
}
