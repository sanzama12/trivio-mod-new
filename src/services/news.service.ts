import { repositories } from '@database/repositories';
import { NewsError } from '@/domain/news';
import { validateNews } from './news-validation';

export const newsService={
  async save(actor:{id:string;admin:boolean},raw:Record<string,unknown>) {
    if(!actor.admin)throw new NewsError('Bạn không có quyền quản lý tin tức.',403);
    const data=raw.data;
    if(!data || typeof data!=='object' || Array.isArray(data))throw new NewsError('Dữ liệu bài viết không hợp lệ.');
    const input=validateNews(data as Record<string,unknown>);
    const categories=await repositories.news.categories();
    if(!categories.some(c=>c.code===input.categoryCode))throw new NewsError('Chọn chuyên mục hợp lệ.',400,'categoryCode');
    const id=raw.id;
    if(id!==undefined && (typeof id!=='string'||!/^news-[a-f0-9-]{36}$/.test(id)))throw new NewsError('ID bài viết không hợp lệ.');
    if(id && (!Number.isInteger(raw.version)||Number(raw.version)<1))throw new NewsError('Thiếu phiên bản bài viết. Tải lại trang.',409);
    try { return await repositories.news.save(input,actor.id,id as string|undefined,raw.version as number|undefined); }
    catch(error) {
      if((error as {code?:string}).code==='23505')throw new NewsError('Đường dẫn đã được dùng. Hãy chọn đường dẫn khác.',409,'slug');
      throw error;
    }
  },
};
