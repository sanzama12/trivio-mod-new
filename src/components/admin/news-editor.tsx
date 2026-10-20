'use client';

import { useState,type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type NewsCategory,type NewsInput,type NewsPost,type NewsStatus,NEWS_STATUS_LABELS } from '@/domain/news';
import { RichNewsEditor } from './rich-news-editor';
import { plainNewsToHtml } from '@/lib/news-html';
import { newsSlug } from '@/lib/news-content';
import { NewsContent } from '@/components/news/news-content';
import { Button,buttonClass } from '@/components/ui/button';
import { inputCls,selectCls } from './ui';
import { useAdminPost } from './use-admin-post';

export function NewsEditor({initial,categories}:{initial:NewsPost|null;categories:NewsCategory[]}) {
  const router=useRouter();
  const {post,busy}=useAdminPost();
  const [data,setData]=useState<NewsInput>(initial?{...initial,body:initial.bodyFormat==='html'?initial.body:plainNewsToHtml(initial.body),bodyFormat:'html'}:{bodyFormat:'html',title:'',slug:'',summary:'',body:'',categoryCode:categories[0]?.code??'',contentType:'article',videoUrl:null,coverUrl:null,sourceUrl:null,season:null,status:'draft'});
  const [saved,setSaved]=useState({id:initial?.id,version:initial?.version,publishedAt:initial?.publishedAt});
  const [slugEdited,setSlugEdited]=useState(!!initial);
  const [preview,setPreview]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const field=<K extends keyof NewsInput>(key:K,value:NewsInput[K])=>setData(current=>({...current,[key]:value}));
  const save=async(status:NewsStatus)=>{
    if(busy)return;
    if(status==='archived'&&!window.confirm('Gỡ bài khỏi trang công khai? Bạn có thể đăng lại sau.'))return;
    setError('');setMessage('');
    const result=await post('/api/admin/news',{id:saved.id,version:saved.version,data:{...data,status}},{refresh:false});
    if(!result.ok){setError(result.message??'Không lưu được bài.');return;}
    const id=String(result.id);
    setData(current=>({...current,status,slug:String(result.slug)}));
    setSaved({id,version:Number(result.version),publishedAt:result.publishedAt as string|null});
    setMessage(status==='published'?'Đã đăng bài. Nội dung đã xuất hiện ở mục Tin tức.':status==='archived'?'Đã gỡ bài khỏi trang công khai.':'Đã lưu bản nháp.');
    if(!saved.id)router.replace(`/quan-tri/tin-tuc/${id}`);
    else router.refresh();
  };
  const submit=(event:FormEvent)=>{event.preventDefault();void save(data.status);};
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">{NEWS_STATUS_LABELS[data.status]}</span><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={()=>setPreview(!preview)}>{preview?'Đóng xem trước':'Xem trước'}</Button>{saved.id&&data.status==='published'&&<Link target="_blank" href={`/tin-tuc/${data.slug}`} className={buttonClass({variant:'secondary'})}>Xem bài đã đăng</Link>}</div></div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {message&&<p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <label className="block text-sm font-semibold">Tiêu đề <span className="text-red-600">*</span><input required minLength={5} maxLength={180} className={`${inputCls} mt-2`} value={data.title} onChange={e=>{const title=e.target.value;setData(current=>({...current,title,slug:!slugEdited&&!saved.id?newsSlug(title):current.slug}));}} placeholder="Ví dụ: Các bước chuẩn bị danh sách nguyện vọng"/></label>
        <label className="block text-sm font-semibold">Đường dẫn bài viết<input required minLength={3} maxLength={180} className={`${inputCls} mt-2`} readOnly={!!saved.publishedAt} value={data.slug} onChange={e=>{setSlugEdited(true);field('slug',e.target.value);}}/><span className="mt-1 block text-xs font-normal text-slate-500">/tin-tuc/{data.slug||'duong-dan-bai-viet'}{saved.publishedAt?' · Giữ nguyên đường dẫn sau khi xuất bản.':''}</span></label>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block text-sm font-semibold">Chuyên mục<select className={`${selectCls} mt-2 w-full`} value={data.categoryCode} onChange={e=>field('categoryCode',e.target.value)}>{categories.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
          <label className="block text-sm font-semibold">Loại nội dung<select className={`${selectCls} mt-2 w-full`} value={data.contentType} onChange={e=>{const contentType=e.target.value as NewsInput['contentType'];setData(current=>({...current,contentType,videoUrl:contentType==='article'?null:current.videoUrl}));}}><option value="article">Bài viết</option><option value="video">Video</option></select></label>
          <label className="block text-sm font-semibold">Mùa tuyển sinh (nếu có)<input type="number" min={2000} max={2100} className={`${inputCls} mt-2`} value={data.season??''} onChange={e=>field('season',e.target.value?Number(e.target.value):null)} placeholder="Ví dụ: 2027"/></label>
        </div>
        <label className="block text-sm font-semibold">Tóm tắt<textarea maxLength={500} rows={3} className={`${inputCls} mt-2 h-auto py-3`} value={data.summary} onChange={e=>field('summary',e.target.value)} placeholder="Nội dung chính của bài, ít nhất 20 ký tự khi đăng."/><span className="text-xs font-normal text-slate-500">{data.summary.length}/500 ký tự</span></label>
        {data.contentType==='video'&&<label className="block text-sm font-semibold">Liên kết video<input type="url" maxLength={2000} className={`${inputCls} mt-2`} value={data.videoUrl??''} onChange={e=>field('videoUrl',e.target.value||null)} placeholder="https://www.youtube.com/watch?v=…"/><span className="mt-1 block text-xs font-normal text-slate-500">YouTube, Vimeo hoặc file MP4/WebM có đường dẫn HTTPS. Đăng video lên dịch vụ lưu trữ trước rồi dán liên kết tại đây.</span></label>}
        <div><label htmlFor="news-body" className="block text-sm font-semibold">{data.contentType==='video'?'Nội dung hướng dẫn / bản chép lời':'Nội dung bài viết'}</label><RichNewsEditor value={data.body} disabled={busy} onChange={html=>setData(current=>({...current,body:html,bodyFormat:'html'}))}/><p className="mt-2 text-xs text-slate-500">Bôi đen văn bản để đổi phông, cỡ chữ hoặc màu. Có thể dán nội dung từ Word, chèn ảnh bằng liên kết HTTPS và thêm bảng. Ctrl+Z để hoàn tác.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Ảnh bìa (URL HTTPS)<input type="url" maxLength={2000} className={`${inputCls} mt-2`} value={data.coverUrl??''} onChange={e=>field('coverUrl',e.target.value||null)} placeholder="https://…/anh-bia.jpg"/></label>
          <label className="block text-sm font-semibold">Nguồn tham khảo (URL HTTPS)<input type="url" maxLength={2000} className={`${inputCls} mt-2`} value={data.sourceUrl??''} onChange={e=>field('sourceUrl',e.target.value||null)} placeholder="https://…"/></label>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
          <Button type="submit">{busy?'Đang lưu…':data.status==='published'?'Cập nhật bài đã đăng':'Lưu thay đổi'}</Button>
          {data.status!=='published'&&<Button variant="secondary" onClick={()=>void save('published')}>Đăng bài</Button>}
          {data.status!=='draft'&&<Button variant="secondary" onClick={()=>void save('draft')}>Chuyển về nháp</Button>}
          {saved.id&&data.status!=='archived'&&<Button variant="secondary" onClick={()=>void save('archived')}>Gỡ bài</Button>}
          <Link href="/quan-tri/tin-tuc" className={buttonClass({variant:'ghost'})}>Về danh sách</Link>
        </div>
      </fieldset>
    </form>
    {preview&&<section aria-label="Xem trước bài viết" className="mx-auto max-w-3xl rounded-2xl border border-primary-200 bg-white p-6 sm:p-8"><p className="mb-4 text-sm font-semibold text-primary-700">Bản xem trước · chưa lưu thay đổi</p><h2 className="text-3xl font-bold">{data.title||'Tiêu đề bài viết'}</h2><p className="my-6 text-lg leading-8 text-slate-600">{data.summary}</p><NewsContent post={data}/></section>}
  </div>;
}
