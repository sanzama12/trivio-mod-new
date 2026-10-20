'use client';
import {useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {type Material,type MaterialInput,type MaterialStatus,type MaterialSubject,MATERIAL_KINDS} from '@/domain/materials';
import {NEWS_STATUS_LABELS} from '@/domain/news';
import {newsSlug} from '@/lib/news-content';
import {MaterialMedia} from '@/components/materials/material-media';
import {Button,buttonClass} from '@/components/ui/button';
import {inputCls,selectCls} from './ui';
export function MaterialEditor({initial,subjects}:{initial:Material|null;subjects:MaterialSubject[]}){
  const router=useRouter();const fileInput=useRef<HTMLInputElement>(null);
  const [data,setData]=useState<MaterialInput>(initial??{title:'',slug:'',description:'',subjectId:subjects[0]?.id??'',kind:'pdf',mediaUrl:null,status:'draft'});
  const [saved,setSaved]=useState(initial);const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [preview,setPreview]=useState(false);const [slugEdited,setSlugEdited]=useState(!!initial);
  const field=<K extends keyof MaterialInput>(key:K,value:MaterialInput[K])=>setData(d=>({...d,[key]:value}));
  const save=async(status:MaterialStatus)=>{
    if(busy)return;if(status==='archived'&&!window.confirm('Gỡ tài liệu khỏi trang công khai?'))return;
    setError('');setMessage('');
    if(file&&file.size>10*1024*1024){setError('File PDF tối đa 10 MB.');return;}
    setBusy(true);
    try{
      const form=new FormData();form.set('payload',JSON.stringify({id:saved?.id,version:saved?.version,data:{...data,status}}));if(file&&data.kind==='pdf')form.set('file',file);
      const response=await fetch('/api/admin/materials',{method:'POST',body:form});
      const result=await response.json().catch(()=>({ok:false,message:`Máy chủ trả mã ${response.status}. File có thể vượt giới hạn tải lên của máy chủ.`}));
      if(!result.ok){setError(result.message??'Chưa lưu được tài liệu.');return;}
      const item=result.item as Material;setSaved(item);setData(item);setFile(null);if(fileInput.current)fileInput.current.value='';
      setMessage(status==='published'?'Đã đăng tài liệu.':status==='archived'?'Đã gỡ tài liệu và khóa đường dẫn tải file.':'Đã lưu nháp.');
      if(!saved)router.replace(`/quan-tri/tai-lieu/${item.id}`);else router.refresh();
    }catch{setError('Không kết nối được máy chủ. Vui lòng thử lại.');}finally{setBusy(false);}
  };
  const submit=(e:FormEvent)=>{e.preventDefault();void save(data.status);};
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">{NEWS_STATUS_LABELS[data.status]}</p><div className="flex gap-3"><Button variant="secondary" onClick={()=>setPreview(!preview)}>{preview?'Đóng xem trước':'Xem trước'}</Button>{saved?.status==='published'&&<Link href={`/tai-lieu/${saved.slug}`} target="_blank" className={buttonClass({variant:'secondary'})}>Xem tài liệu</Link>}</div></div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
      <label className="block text-sm font-semibold">Tên tài liệu<input required minLength={5} maxLength={180} className={`${inputCls} mt-2`} value={data.title} onChange={e=>{const title=e.target.value;setData(d=>({...d,title,slug:!slugEdited&&!saved?newsSlug(title):d.slug}));}} placeholder="Ví dụ: Tổng hợp công thức Toán lớp 12"/></label>
      <label className="block text-sm font-semibold">Đường dẫn<input required minLength={3} maxLength={180} readOnly={!!saved?.publishedAt} className={`${inputCls} mt-2`} value={data.slug} onChange={e=>{setSlugEdited(true);field('slug',e.target.value);}}/><span className="mt-1 block text-xs font-normal text-slate-500">/tai-lieu/{data.slug||'ten-tai-lieu'}{saved?.publishedAt?' · Đường dẫn được giữ nguyên sau khi đăng.':''}</span></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">Môn học (nhãn)<select className={`${selectCls} mt-2 w-full`} value={data.subjectId} onChange={e=>field('subjectId',e.target.value)}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="block text-sm font-semibold">Loại tài liệu<select className={`${selectCls} mt-2 w-full`} value={data.kind} onChange={e=>{setFile(null);setData(d=>({...d,kind:e.target.value as MaterialInput['kind'],mediaUrl:null}));}}>{Object.entries(MATERIAL_KINDS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
      <label className="block text-sm font-semibold">Mô tả / hướng dẫn sử dụng<textarea rows={5} maxLength={3000} className={`${inputCls} mt-2 h-auto py-3 font-normal leading-7`} value={data.description} onChange={e=>field('description',e.target.value)}/></label>
      {data.kind==='pdf'?<div className="rounded-xl border border-dashed border-primary-300 bg-primary-50/50 p-5"><label className="block text-sm font-semibold">Chọn file PDF<input ref={fileInput} type="file" accept=".pdf,application/pdf" className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:font-semibold file:text-primary-700" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><p className="mt-3 text-sm text-slate-600">{file?`Đã chọn: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`:saved?.fileName?`File hiện tại: ${saved.fileName}. Không chọn file mới để giữ nguyên.`:'Chưa có file. Tối đa 10 MB mỗi PDF.'}</p></div>:<label className="block text-sm font-semibold">{data.kind==='video'?'Liên kết video':'Liên kết ảnh HTTPS'}<input type="url" maxLength={2000} className={`${inputCls} mt-2`} value={data.mediaUrl??''} onChange={e=>field('mediaUrl',e.target.value||null)} placeholder={data.kind==='video'?'https://www.youtube.com/watch?v=…':'https://…/tai-lieu.jpg'}/><span className="mt-2 block text-xs font-normal text-slate-500">{data.kind==='video'?'Hỗ trợ YouTube, Vimeo và file MP4/WebM HTTPS.':'Dán đường dẫn ảnh trực tiếp, không dùng link của trang chứa ảnh.'}</span></label>}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5"><Button type="submit">{busy?'Đang lưu…':data.status==='published'?'Cập nhật tài liệu':'Lưu thay đổi'}</Button>{data.status!=='published'&&<Button variant="secondary" onClick={()=>void save('published')}>Đăng tài liệu</Button>}{data.status!=='draft'&&<Button variant="secondary" onClick={()=>void save('draft')}>Chuyển về nháp</Button>}{saved&&data.status!=='archived'&&<Button variant="secondary" onClick={()=>void save('archived')}>Gỡ tài liệu</Button>}<Link href="/quan-tri/tai-lieu" className={buttonClass({variant:'ghost'})}>Về danh sách</Link></div>
    </fieldset></form>
    {preview&&<section className="rounded-2xl border border-primary-200 bg-white p-6"><p className="mb-3 text-sm font-semibold text-primary-700">Bản xem trước</p><h2 className="text-2xl font-bold">{data.title}</h2><p className="my-5 whitespace-pre-wrap leading-7 text-slate-600">{data.description}</p>{data.kind==='pdf'?<p className="rounded-lg bg-slate-50 p-4">PDF: {file?.name??saved?.fileName??'Chưa chọn file'}. Nút tải công khai xuất hiện sau khi đăng.</p>:<MaterialMedia item={{...data,id:saved?.id??'',subjectName:subjects.find(s=>s.id===data.subjectId)?.name??'',version:saved?.version??0,publishedAt:null,updatedAt:'',fileName:null,fileSize:null}}/>}</section>}
  </div>;
}
