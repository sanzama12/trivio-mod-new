import Link from 'next/link';
import type { NewsFilter } from '@/domain/news';
import { buttonClass } from '@/components/ui/button';

export function newsListUrl(base:string,filter:NewsFilter,page:number) {
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries({...filter,page:String(page)}))if(value)params.set(key,String(value));
  return `${base}?${params}`;
}
export function NewsPagination({base,filter,total,pageSize}:{base:string;filter:NewsFilter;total:number;pageSize:number}) {
  const pages=Math.max(1,Math.ceil(total/pageSize));
  if(pages===1&&filter.page===1)return null;
  return <nav aria-label="Phân trang tin tức" className="mt-8 flex flex-wrap items-center justify-center gap-4">
    {filter.page>1&&<Link href={newsListUrl(base,filter,filter.page-1)} className={buttonClass({variant:'secondary'})}>Trang trước</Link>}
    <span className="text-sm text-slate-600">Trang {filter.page} / {pages}</span>
    {filter.page<pages&&<Link href={newsListUrl(base,filter,filter.page+1)} className={buttonClass({variant:'secondary'})}>Trang sau</Link>}
  </nav>;
}
