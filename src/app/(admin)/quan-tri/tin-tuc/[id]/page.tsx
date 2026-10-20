import { notFound } from 'next/navigation';
import { adminPage } from '@/lib/admin-page';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminBody,fmtDate } from '@/components/admin/ui';
import { NewsEditor } from '@/components/admin/news-editor';
import { NEWS_STATUS_LABELS } from '@/domain/news';
import { repositories } from '@database/repositories';
export const metadata={title:'Biên tập tin tức',robots:{index:false,follow:false}};
export default async function EditNews({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  await adminPage(`/quan-tri/tin-tuc/${id}`);
  const [item,categories,history]=await Promise.all([repositories.news.byId(id),repositories.news.categories(),repositories.news.history(id)]);
  if(!item)notFound();
  return <><AdminHeader title="Biên tập tin tức" crumb="Tin tức › Chỉnh sửa"/><AdminBody><NewsEditor key={item.id} initial={item} categories={categories}/><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Lịch sử cập nhật</h2><ul className="mt-3 space-y-2 text-sm text-slate-600">{history.map(e=><li key={e.version}>Phiên bản {e.version} · {NEWS_STATUS_LABELS[e.status]} · {e.actor} · {fmtDate(e.at)}</li>)}</ul></section></AdminBody></>;
}
