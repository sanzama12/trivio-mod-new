export type NewsStatus = 'draft' | 'published' | 'archived';
export type NewsType = 'article' | 'video';
export const NEWS_STATUS_LABELS: Record<NewsStatus,string> = {draft:'Bản nháp',published:'Đã đăng',archived:'Đã gỡ'};
export interface NewsCategory { code:string; name:string }
export interface NewsInput {
  bodyFormat?:'plain'|'html';
  title:string; slug:string; summary:string; body:string; categoryCode:string;
  contentType:NewsType; videoUrl:string|null; coverUrl:string|null; sourceUrl:string|null;
  season:number|null; status:NewsStatus;
}
export interface NewsPost extends NewsInput {
  id:string; categoryName:string; version:number; publishedAt:string|null; createdAt:string; updatedAt:string;
}
export type NewsSummary = Omit<NewsPost,'body'|'videoUrl'|'sourceUrl'>;
export interface NewsList { items:NewsSummary[]; total:number; page:number; pageSize:number }
export interface NewsFilter { q:string; category:string; type:string; status:string; page:number }
export class NewsError extends Error {
  constructor(message:string,readonly status=400,readonly field?:string) { super(message); }
}
