import Link from 'next/link';
import type {MaterialFilter} from '@/domain/materials';
import {buttonClass} from '@/components/ui/button';
export function materialUrl(base:string,filter:MaterialFilter,changes:Partial<MaterialFilter>={}){
  const params=new URLSearchParams();for(const [key,value] of Object.entries({...filter,...changes}))if(value)params.set(key,String(value));return `${base}?${params}`;
}
export function MaterialPagination({base,filter,total,pageSize}:{base:string;filter:MaterialFilter;total:number;pageSize:number}){
  const pages=Math.max(1,Math.ceil(total/pageSize));if(pages===1&&filter.page===1)return null;
  return <nav aria-label="Phân trang tài liệu" className="mt-8 flex flex-wrap justify-center gap-4">{filter.page>1&&<Link href={materialUrl(base,filter,{page:filter.page-1})} className={buttonClass({variant:'secondary'})}>Trang trước</Link>}<span className="self-center text-sm text-slate-600">Trang {filter.page} / {pages}</span>{filter.page<pages&&<Link href={materialUrl(base,filter,{page:filter.page+1})} className={buttonClass({variant:'secondary'})}>Trang sau</Link>}</nav>;
}
