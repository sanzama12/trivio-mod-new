import {cache} from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {repositories} from '@database/repositories';
import {MaterialMedia} from '@/components/materials/material-media';
import {MATERIAL_KINDS} from '@/domain/materials';
export const dynamic='force-dynamic';
const getItem=cache((slug:string)=>repositories.materials.publicBySlug(slug));
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const item=await getItem((await params).slug);return item?{title:item.title,description:item.description.slice(0,160)}:{title:'Không tìm thấy tài liệu',robots:{index:false}};}
export default async function MaterialDetail({params}:{params:Promise<{slug:string}>}){
  const item=await getItem((await params).slug);if(!item)notFound();
  return <article className="container-page py-8 sm:py-12"><div className="mx-auto max-w-4xl"><nav aria-label="Đường dẫn" className="mb-7 flex gap-2 text-sm text-primary-700"><Link href="/tai-lieu">Tài liệu</Link><span>/</span><Link href={`/tai-lieu?subject=${encodeURIComponent(item.subjectId)}`}>{item.subjectName}</Link></nav><p className="text-sm font-semibold text-primary-700">{item.subjectName} · {MATERIAL_KINDS[item.kind]}</p><h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{item.title}</h1><p className="mt-3 text-sm text-slate-500">Đăng ngày {new Date(item.publishedAt!).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</p><p className="my-7 whitespace-pre-wrap leading-8 text-slate-600">{item.description}</p><MaterialMedia item={item}/><Link href={`/tai-lieu?subject=${encodeURIComponent(item.subjectId)}`} className="mt-10 inline-block font-semibold text-primary-700">← Tài liệu khác môn {item.subjectName}</Link></div></article>;
}
