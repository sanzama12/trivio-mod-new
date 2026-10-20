import { httpsLink,newsVideo } from '@/lib/news-content';
import type { NewsInput } from '@/domain/news';
import { sanitizeNewsHtml } from '@/lib/news-html';

/** React escapes all text; stored article bodies are never interpreted as HTML. */
export function NewsBody({body,bodyFormat='plain'}:{body:string;bodyFormat?:'plain'|'html'}) {
  if(bodyFormat==='html')return <div className="email-rich-preview news-rich-content text-base leading-8 text-slate-700" dangerouslySetInnerHTML={{__html:sanitizeNewsHtml(body)}}/>;
  return <div className="space-y-5 text-base leading-8 text-slate-700 break-words">{body.split(/\n\s*\n/).filter(Boolean).map((block,i)=>{
    if(block.startsWith('## '))return <h2 key={i} className="pt-3 text-xl font-bold text-slate-900">{block.slice(3)}</h2>;
    const lines=block.split('\n');
    if(lines.every(line=>line.startsWith('- ')))return <ul key={i} className="list-disc space-y-1 pl-6">{lines.map((line,j)=><li key={j}>{line.slice(2)}</li>)}</ul>;
    return <p key={i} className="whitespace-pre-wrap">{block}</p>;
  })}</div>;
}
export function NewsContent({post}:{post:Pick<NewsInput,'body'|'bodyFormat'|'contentType'|'videoUrl'|'sourceUrl'|'title'>}) {
  const video=post.contentType==='video'?newsVideo(post.videoUrl):null;
  const source=httpsLink(post.sourceUrl);
  return <div className="space-y-8">
    {video && <div className="space-y-2">
      {video.kind==='embed' ? <iframe src={video.src} title={post.title} className="aspect-video w-full rounded-2xl border-0 bg-slate-950" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        : <video controls preload="metadata" className="aspect-video w-full rounded-2xl bg-slate-950" src={video.src}>Trình duyệt không hỗ trợ phát video.</video>}
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-700 underline">Mở video trong trang riêng</a>
    </div>}
    <NewsBody body={post.body} bodyFormat={post.bodyFormat}/>
    {source && <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><span className="font-semibold">Nguồn tham khảo: </span><a href={source} target="_blank" rel="noopener noreferrer" className="break-all text-primary-700 underline">{new URL(source).hostname}</a></aside>}
  </div>;
}
