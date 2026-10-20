import { NewsError, type NewsFilter, type NewsInput } from '@/domain/news';
import { httpsLink, newsSlug, newsVideo } from '@/lib/news-content';
import { sanitizeNewsHtml,newsHtmlText } from '@/lib/news-html';

export function validateNews(raw:Record<string,unknown>):NewsInput {
  const text=(key:string,max:number)=>{
    const value=typeof raw[key]==='string' ? raw[key].trim() : '';
    if(value.length>max) throw new NewsError(`Nội dung vượt quá ${max.toLocaleString('vi-VN')} ký tự.`,400,key);
    return value;
  };
  if(raw.bodyFormat!==undefined&&raw.bodyFormat!=='plain'&&raw.bodyFormat!=='html')throw new NewsError('Định dạng nội dung không hợp lệ.',400,'body');
  const bodyFormat=raw.bodyFormat==='html'?'html':'plain';
  const title=text('title',180), summary=text('summary',500), rawBody=text('body',50000);
  const body=bodyFormat==='html'?sanitizeNewsHtml(rawBody):rawBody;
  if(body.length>50000)throw new NewsError('Nội dung quá dài.',400,'body');
  if(title.length<5) throw new NewsError('Tiêu đề cần ít nhất 5 ký tự.',400,'title');
  const slug=text('slug',180)||newsSlug(title);
  if(slug.length<3 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new NewsError('Đường dẫn chỉ gồm chữ không dấu, số và dấu gạch nối.',400,'slug');
  const status=raw.status;
  if(status!=='draft' && status!=='published' && status!=='archived') throw new NewsError('Trạng thái không hợp lệ.',400,'status');
  const contentType=raw.contentType;
  if(contentType!=='article' && contentType!=='video') throw new NewsError('Chọn bài viết hoặc video.',400,'contentType');
  const link=(key:string)=>{const value=text(key,2000);const url=httpsLink(value);if(value&&!url)throw new NewsError('Cần đường dẫn HTTPS hợp lệ.',400,key);return url;};
  const coverUrl=link('coverUrl'),sourceUrl=link('sourceUrl');
  const video=contentType==='video' ? newsVideo(raw.videoUrl) : null;
  if(contentType==='video' && typeof raw.videoUrl==='string' && raw.videoUrl.trim() && !video) throw new NewsError('Dùng link YouTube, Vimeo hoặc file MP4/WebM HTTPS.',400,'videoUrl');
  const season=raw.season==='' || raw.season==null ? null : Number(raw.season);
  if(season!==null && (!Number.isInteger(season)||season<2000||season>2100))throw new NewsError('Mùa tuyển sinh phải từ 2000 đến 2100.',400,'season');
  if(status==='published') {
    if(summary.length<20)throw new NewsError('Bổ sung tóm tắt ít nhất 20 ký tự trước khi đăng.',400,'summary');
    if(contentType==='article' && (bodyFormat==='html'?newsHtmlText(body):body).length<20)throw new NewsError('Bổ sung nội dung ít nhất 20 ký tự trước khi đăng.',400,'body');
    if(contentType==='video' && !video)throw new NewsError('Bổ sung liên kết video trước khi đăng.',400,'videoUrl');
  }
  return {title,slug,summary,body,bodyFormat,categoryCode:text('categoryCode',80),status,contentType,videoUrl:video?.url??null,coverUrl,sourceUrl,season};
}
export function newsFilter(raw:Record<string,string|string[]|undefined>):NewsFilter {
  const get=(key:string)=>typeof raw[key]==='string' ? raw[key] as string : '';
  const page=Number(get('page'));
  return {q:get('q').trim().slice(0,100),category:get('category').slice(0,80),type:['article','video'].includes(get('type'))?get('type'):'',status:['draft','published','archived'].includes(get('status'))?get('status'):'',page:Number.isInteger(page)&&page>0?Math.min(page,10000):1};
}
