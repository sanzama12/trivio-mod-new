import type {Material} from '@/domain/materials';
import {httpsLink,newsVideo} from '@/lib/news-content';
import {buttonClass} from '@/components/ui/button';
export function MaterialMedia({item}:{item:Material}){
  if(item.kind==='pdf')return <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6"><h2 className="text-lg font-semibold">Tài liệu PDF</h2><p className="mt-2 break-all text-sm text-slate-600">{item.fileName}{item.fileSize?` · ${(item.fileSize/1024/1024).toFixed(2)} MB`:''}</p>{item.fileName?<a href={`/api/materials/${item.id}/download`} className={buttonClass({className:'mt-5'})} download>Tải xuống PDF</a>:<p className="mt-4 text-slate-500">Chưa đính kèm file PDF.</p>}</div>;
  if(item.kind==='image')return httpsLink(item.mediaUrl)?<figure><img src={item.mediaUrl!} alt={item.title} className="mx-auto h-auto max-w-full rounded-2xl border border-slate-200"/><figcaption className="mt-3 text-center text-sm text-slate-500"><a href={item.mediaUrl!} target="_blank" rel="noopener noreferrer" className="text-primary-700 underline">Mở ảnh kích thước gốc</a></figcaption></figure>:null;
  const video=newsVideo(item.mediaUrl);if(!video)return null;
  return <div className="space-y-3">{video.kind==='embed'?<iframe src={video.src} title={item.title} className="aspect-video w-full rounded-2xl border-0 bg-slate-950" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<video src={video.src} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-slate-950"/>}<a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-700 underline">Mở video trong trang riêng</a></div>;
}
