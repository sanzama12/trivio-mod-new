import type { Metadata } from 'next';
import Link from 'next/link';
import { LuNewspaper,LuPlay } from 'react-icons/lu';
import { newsService } from '@/services/news.service';
import { NewsPagination } from '@/components/news/news-pagination';
import { httpsLink } from '@/lib/news-content';
import { buttonClass } from '@/components/ui/button';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Tin tức tuyển sinh & hướng dẫn nguyện vọng',description:'Bài viết và video về tuyển sinh, hướng dẫn chuẩn bị và sắp xếp nguyện vọng.'};
const date=(value:string|null)=>value?new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
export default async function NewsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {filter,categories,list}=await newsService.getListPage(await searchParams);
  const all = await newsService.getListPage({});
  return <div className="container-page py-8 sm:py-12">
    <header className="mb-8 rounded-3xl bg-primary-50 p-6 sm:p-10">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary-700"><LuNewspaper aria-hidden/> Cẩm nang tuyển sinh</p>
      <h1 className="text-slate-900 text-3xl md:text-4xl font-bold tracking-tight">Tin tức & hướng dẫn</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-slate-600">Cập nhật tuyển sinh, xem video hướng dẫn và chuẩn bị nguyện vọng từng bước.</p>
    </header>
    <nav aria-label="Tài nguyên" className="mb-6 flex gap-4 text-sm font-semibold"><span aria-current="page">Tin tức</span><Link href="/tai-lieu" className="inline-flex min-h-6 items-center text-primary-700 hover:underline">Tài liệu</Link></nav>
    <form action="/tin-tuc" className="mb-8 grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <label className="text-sm font-medium">Tìm bài viết<input name="q" defaultValue={filter.q} placeholder="Tiêu đề, từ khóa…" maxLength={100} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3"/></label>
      <label className="text-sm font-medium">Chuyên mục<select name="category" defaultValue={filter.category} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Tất cả chuyên mục</option>{categories.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      <label className="text-sm font-medium">Nội dung<select name="type" defaultValue={filter.type} className="mt-1 block h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Bài viết và video</option><option value="article">Bài viết</option><option value="video">Video</option></select></label>
      <button className={buttonClass()} type="submit">Tìm kiếm</button>
    </form>
    <p className="mb-4 text-sm text-slate-600">{list.total} nội dung đã đăng</p>
    {!list.items.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center"><LuNewspaper className="mx-auto mb-3 size-10 text-slate-600"/><h2 className="text-lg font-semibold">{all.list.total === 0 ? "Chưa có bài viết nào được xuất bản" : "Chưa có bài viết phù hợp"}</h2><p className="mt-2 text-slate-600">{all.list.total === 0 ? "Hãy khám phá các chương trình đào tạo." : "Thử đổi bộ lọc hoặc quay lại khi có nội dung mới."}</p><Link href={all.list.total === 0 ? "/chuong-trinh" : "/tin-tuc"} className="mt-4 inline-block font-semibold text-primary-700">{all.list.total === 0 ? "Tra chương trình" : "Xem tất cả tin tức"}</Link></div> :
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.items.map(post=><article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <Link href={`/tin-tuc/${post.slug}`} className="group block h-full">
          <div className="relative aspect-video overflow-hidden bg-primary-50">
            {httpsLink(post.coverUrl)?<img src={post.coverUrl!} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105"/>:<LuNewspaper className="absolute inset-0 m-auto size-14 text-primary-200"/>}
            {post.contentType==='video'&&<span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-primary-900/85 px-3 py-1 text-xs font-semibold text-white"><LuPlay aria-hidden/> Video</span>}
          </div>
          <div className="p-5"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><span className="font-semibold text-primary-700">{post.categoryName}</span><span>·</span><time dateTime={post.publishedAt??undefined}>{date(post.publishedAt)}</time>{post.season&&<span>· Mùa {post.season}</span>}</div><h2 className="text-lg font-semibold leading-7 text-slate-900 group-hover:text-primary-700">{post.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 max-w-prose">{post.summary}</p><span className="mt-4 inline-block text-sm font-semibold text-primary-700">{post.contentType==='video'?'Xem video':'Đọc bài viết'} →</span></div>
        </Link>
      </article>)}</div>}
    <NewsPagination base="/tin-tuc" filter={filter} total={list.total} pageSize={list.pageSize}/>
  </div>;
}
