import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { repositories } from '@database/repositories';
import { NewsContent } from '@/components/news/news-content';
import { httpsLink } from '@/lib/news-content';

export const dynamic='force-dynamic';
const getPost=cache((slug:string)=>repositories.news.publicBySlug(slug));
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const post=await getPost((await params).slug);
  if(!post)return {title:'Không tìm thấy bài viết',robots:{index:false}};
  return {title:post.title,description:post.summary,openGraph:{type:'article',title:post.title,description:post.summary,publishedTime:post.publishedAt??undefined,...(httpsLink(post.coverUrl)?{images:[post.coverUrl!]}:{})}};
}
export default async function NewsDetail({params}:{params:Promise<{slug:string}>}) {
  const post=await getPost((await params).slug);
  if(!post)notFound();
  return <article className="container-page py-8 sm:py-12"><div className="mx-auto max-w-3xl">
    <nav aria-label="Đường dẫn" className="mb-8 text-sm text-slate-500"><Link href="/tin-tuc" className="text-primary-700 hover:underline">Tin tức</Link><span className="mx-2">/</span>{post.categoryName}</nav>
    <p className="text-sm font-semibold text-primary-700">{post.categoryName}{post.season?` · Mùa ${post.season}`:''}</p>
    <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{post.title}</h1>
    <p className="mt-4 text-sm text-slate-500">Ban biên tập Trovio · <time dateTime={post.publishedAt!}>{new Date(post.publishedAt!).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</time></p>
    <p className="my-6 text-lg leading-8 text-slate-600">{post.summary}</p>
    {httpsLink(post.coverUrl)&&post.contentType==='article'&&<img src={post.coverUrl!} alt="" className="mb-8 aspect-video w-full rounded-2xl object-cover"/>}
    <NewsContent post={post}/>
    <div className="mt-12 border-t border-slate-200 pt-6"><Link href="/tin-tuc" className="font-semibold text-primary-700">← Xem các tin khác</Link></div>
  </div></article>;
}
