import type { Metadata } from 'next';
import Link from 'next/link';
import { LuNewspaper,LuPlay } from 'react-icons/lu';
import { repositories } from '@database/repositories';
import { newsFilter } from '@/services/news-validation';
import { NewsPagination } from '@/components/news/news-pagination';
import { httpsLink } from '@/lib/news-content';
import { buttonClass } from '@/components/ui/button';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Tin tức tuyển sinh & hướng dẫn nguyện vọng',description:'Bài viết và video về tuyển sinh, hướng dẫn chuẩn bị và sắp xếp nguyện vọng.'};
const date=(value:string|null)=>value?new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
export default async function NewsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const filter=newsFilter(await searchParams);
  const [categories,list]=await Promise.all([repositories.news.categories(),repositories.news.list(filter)]);
  return <div className="container-page py-8 sm:py-12">
    <header className="mb-8 rounded-3xl bg-primary-50 p-6 sm:p-10">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-primary-700"><LuNewspaper aria-hidden/> Cẩm nang tuyển sinh</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tin tức & hướng dẫn</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">Cập nhật tuyển sinh, xem video hướng dẫn và chuẩn bị nguyện vọng từng bước.</p>
    </header>
    <form action="/tin-tuc" className="mb-8 grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="text-sm font-medium">Tìm bài viết<input name="q" defaultValue={filter.q} placeholder="Tiêu đề, từ khóa…" maxLength={100} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3"/></label>
      <label className="text-sm font-medium">Chuyên mục<select name="category" defaultValue={filter.category} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Tất cả chuyên mục</option>{categories.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      <label className="text-sm font-medium">Nội dung<select name="type" defaultValue={filter.type} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Bài viết và video</option><option value="article">Bài viết</option><option value="video">Video</option></select></label>
      <button className={buttonClass()} type="submit">Tìm kiếm</button>
    </form>
    <p className="mb-4 text-sm text-slate-500">{list.total} nội dung đã đăng</p>
    {!list.items.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center"><LuNewspaper className="mx-auto mb-3 size-10 text-slate-400"/><h2 className="text-xl font-semibold">Chưa có bài viết phù hợp</h2><p className="mt-2 text-slate-500">Thử đổi bộ lọc hoặc quay lại khi có nội dung mới.</p><Link href="/tin-tuc" className="mt-4 inline-block font-semibold text-primary-700">Xem tất cả tin tức</Link></div> :
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.items.map(post=><article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <Link href={`/tin-tuc/${post.slug}`} className="group block h-full">
          <div className="relative aspect-video overflow-hidden bg-primary-50">
            {httpsLink(post.coverUrl)?<img src={post.coverUrl!} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105"/>:<LuNewspaper className="absolute inset-0 m-auto size-14 text-primary-200"/>}
            {post.contentType==='video'&&<span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white"><LuPlay aria-hidden/> Video</span>}
          </div>
          <div className="p-5"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="font-semibold text-primary-700">{post.categoryName}</span><span>·</span><time dateTime={post.publishedAt??undefined}>{date(post.publishedAt)}</time>{post.season&&<span>· Mùa {post.season}</span>}</div><h2 className="text-lg font-bold leading-7 text-slate-900 group-hover:text-primary-700">{post.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{post.summary}</p><span className="mt-4 inline-block text-sm font-semibold text-primary-700">{post.contentType==='video'?'Xem video':'Đọc bài viết'} →</span></div>
        </Link>
      </article>)}</div>}
    <NewsPagination base="/tin-tuc" filter={filter} total={list.total} pageSize={list.pageSize}/>
  </div>;
}
