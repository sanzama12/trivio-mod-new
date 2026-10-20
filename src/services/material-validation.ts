import { MaterialError,type MaterialInput,type MaterialFilter } from '@/domain/materials';
import { httpsLink,newsSlug,newsVideo } from '@/lib/news-content';
export const MAX_PDF_BYTES=10*1024*1024;
export function validateMaterial(raw:Record<string,unknown>):MaterialInput {
  const text=(key:string,max:number)=>{const v=typeof raw[key]==='string'?raw[key].trim():'';if(v.length>max)throw new MaterialError(`Trường ${key} quá dài.`);return v;};
  const title=text('title',180),slug=text('slug',180)||newsSlug(title),description=text('description',3000),subjectId=text('subjectId',80);
  if(title.length<5)throw new MaterialError('Tiêu đề cần ít nhất 5 ký tự.');
  if(slug.length<3||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))throw new MaterialError('Đường dẫn chỉ gồm chữ không dấu, số và dấu gạch.');
  if(!subjectId)throw new MaterialError('Vui lòng chọn môn học.');
  const {kind,status}=raw;
  if(kind!=='pdf'&&kind!=='video'&&kind!=='image')throw new MaterialError('Loại tài liệu không hợp lệ.');
  if(status!=='draft'&&status!=='published'&&status!=='archived')throw new MaterialError('Trạng thái không hợp lệ.');
  const media=text('mediaUrl',2000);
  const mediaUrl=kind==='video'?newsVideo(media)?.url??null:kind==='image'?httpsLink(media):null;
  if(kind!=='pdf'&&((media&&!mediaUrl)||(status==='published'&&!mediaUrl)))throw new MaterialError(kind==='video'?'Nhập link YouTube, Vimeo hoặc MP4/WebM HTTPS hợp lệ.':'Nhập liên kết ảnh HTTPS hợp lệ.');
  return {title,slug,description,subjectId,kind,status,mediaUrl};
}
export function materialFilter(raw:Record<string,string|string[]|undefined>):MaterialFilter {
  const get=(key:string)=>typeof raw[key]==='string'?raw[key] as string:'';
  const page=Number(get('page'));
  return {subject:get('subject').slice(0,80),kind:['pdf','video','image'].includes(get('kind'))?get('kind'):'',status:['draft','published','archived'].includes(get('status'))?get('status'):'',q:get('q').trim().slice(0,100),page:Number.isInteger(page)&&page>0?Math.min(page,10000):1};
}
export function validatePdf(bytes:Uint8Array,name:string):{bytes:Uint8Array;filename:string} {
  if(bytes.length>MAX_PDF_BYTES)throw new MaterialError('File PDF tối đa 10 MB.',413);
  const start=new TextDecoder('ascii').decode(bytes.subarray(0,8));
  const end=new TextDecoder('ascii').decode(bytes.subarray(Math.max(0,bytes.length-1024)));
  if(!/^%PDF-\d\.\d/.test(start)||!end.includes('%%EOF'))throw new MaterialError('File không có cấu trúc PDF hợp lệ.');
  const filename=(name.split(/[\\/]/).at(-1)??'tai-lieu.pdf').replace(/[\u0000-\u001f\u007f"<>]/g,'').slice(0,175).replace(/\.pdf$/i,'')+'.pdf';
  return {bytes,filename};
}
