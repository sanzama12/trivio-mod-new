import type { Metadata } from 'next';
import Link from 'next/link';
import { adminPage } from '@/lib/admin-page';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminBody,inputCls,selectCls,fmtDate } from '@/components/admin/ui';
import { buttonClass } from '@/components/ui/button';
import { NewsPagination } from '@/components/news/news-pagination';
import { NEWS_STATUS_LABELS } from '@/domain/news';
import { repositories } from '@database/repositories';
import { newsFilter } from '@/services/news-validation';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Quản trị tin tức & video',robots:{index:false,follow:false}};
export default async function AdminNews({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  await adminPage('/quan-tri/tin-tuc');
  const filter=newsFilter(await searchParams);
  const [list,categories]=await Promise.all([repositories.news.list(filter,true),repositories.news.categories()]);
  return <><AdminHeader title="Tin tức & Video" crumb="Tin tức" actions={<Link href="/quan-tri/tin-tuc/tao-moi" className={buttonClass()}>Tạo bài mới</Link>}/><AdminBody>
    <p className="text-sm text-slate-600">Biên tập tin tuyển sinh, video và hướng dẫn nguyện vọng. Chỉ bài đã đăng mới xuất hiện công khai.</p>
    <form action="/quan-tri/tin-tuc" className="flex flex-wrap items-end gap-3">
      <label className="min-w-48 flex-1 text-sm">Tìm bài<input name="q" defaultValue={filter.q} className={`${inputCls} mt-1`} placeholder="Tiêu đề, từ khóa…"/></label>
      <label className="text-sm">Trạng thái<select name="status" defaultValue={filter.status} className={`${selectCls} mt-1 block`}><option value="">Tất cả trạng thái</option>{Object.entries(NEWS_STATUS_LABELS).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      <label className="text-sm">Chuyên mục<select name="category" defaultValue={filter.category} className={`${selectCls} mt-1 block`}><option value="">Tất cả chuyên mục</option>{categories.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      <button type="submit" className={buttonClass({variant:'secondary'})}>Lọc</button>
    </form>
    <p className="text-sm text-slate-500">{list.total} bài viết / video</p>
    {!list.items.length?<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-lg font-semibold">Chưa có bài viết phù hợp</h2><p className="mt-2 text-sm text-slate-500">Tạo bài mới hoặc thay đổi bộ lọc để bắt đầu.</p></div>:<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Bài viết','Chuyên mục','Trạng thái','Cập nhật','Thao tác'].map(label=><th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{list.items.map(item=><tr key={item.id} className="border-t border-slate-100"><td className="min-w-64 px-4 py-4"><Link href={`/quan-tri/tin-tuc/${item.id}`} className="font-semibold text-slate-900 hover:text-primary-700">{item.title}</Link><p className="mt-1 text-xs text-slate-500">{item.contentType==='video'?'Video':'Bài viết'}{item.season?` · Mùa ${item.season}`:''}</p></td><td className="px-4 py-4">{item.categoryName}</td><td className="whitespace-nowrap px-4 py-4">{NEWS_STATUS_LABELS[item.status]}</td><td className="whitespace-nowrap px-4 py-4">{fmtDate(item.updatedAt)}</td><td className="px-4 py-4"><Link href={`/quan-tri/tin-tuc/${item.id}`} className="font-semibold text-primary-700">Chỉnh sửa</Link></td></tr>)}</tbody></table></div>}
    <NewsPagination base="/quan-tri/tin-tuc" filter={filter} total={list.total} pageSize={list.pageSize}/>
  </AdminBody></>;
}
