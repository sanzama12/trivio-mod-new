import { query, withTransaction } from '@database/client';
import { NewsError, type NewsCategory, type NewsFilter, type NewsInput, type NewsList, type NewsPost } from '@/domain/news';

const summaryColumns=`p.id,p.slug,p.title,p.summary,p.category_code AS "categoryCode",c.name AS "categoryName",
 p.content_type AS "contentType",p.cover_url AS "coverUrl",p.season,p.status,p.version,
 p.published_at::text AS "publishedAt",p.created_at::text AS "createdAt",p.updated_at::text AS "updatedAt"`;
const detailColumns=summaryColumns+`,p.body,p.body_format AS "bodyFormat",p.video_url AS "videoUrl",p.source_url AS "sourceUrl"`;

export const postgresNewsRepository = {
  categories:()=>query<NewsCategory>('SELECT code,name FROM trovio.news_categories ORDER BY position,code'),
  async list(filter:NewsFilter,admin=false):Promise<NewsList> {
    const params:unknown[]=[];
    const clauses=['true'];
    const condition=(sql:string,value:unknown)=>{params.push(value);clauses.push(sql.replace('?',`$${params.length}`));};
    if(filter.category) condition('p.category_code = ?',filter.category);
    if(filter.type) condition('p.content_type = ?',filter.type);
    if(admin&&filter.status) condition('p.status = ?',filter.status);
    if(filter.q) condition("strpos(lower(p.title || ' ' || p.summary), lower(?)) > 0",filter.q);
    const pageSize=admin?20:12;
    params.push(pageSize,(filter.page-1)*pageSize);
    const order=admin?'"updatedAt" DESC,id':'"publishedAt" DESC,id';
    const [result]=await query<{items:NewsList['items'];total:number}>(`WITH matching AS (
      SELECT ${summaryColumns} FROM ${admin?'trovio.news_posts':'trovio.published_news'} p
      JOIN trovio.news_categories c ON c.code=p.category_code WHERE ${clauses.join(' AND ')}
    ) SELECT (SELECT count(*)::int FROM matching) AS total,
      COALESCE((SELECT jsonb_agg(to_jsonb(page_rows) ORDER BY ${order}) FROM
       (SELECT * FROM matching ORDER BY ${order} LIMIT $${params.length-1} OFFSET $${params.length}) page_rows),'[]'::jsonb) AS items`,params);
    return {items:result.items,total:result.total,page:filter.page,pageSize};
  },
  async publicBySlug(slug:string):Promise<NewsPost|null> {
    return (await query<NewsPost>(`SELECT ${detailColumns} FROM trovio.published_news p
      JOIN trovio.news_categories c ON c.code=p.category_code WHERE p.slug=$1`,[slug]))[0]??null;
  },
  async byId(id:string):Promise<NewsPost|null> {
    return (await query<NewsPost>(`SELECT ${detailColumns} FROM trovio.news_posts p
      JOIN trovio.news_categories c ON c.code=p.category_code WHERE p.id=$1`,[id]))[0]??null;
  },
  async history(id:string) {
    return query<{version:number;status:NewsPost['status'];at:string;actor:string}>(`SELECT e.version,e.status,e.created_at::text AS at,
      COALESCE(u.name,'Tài khoản đã xóa') AS actor FROM trovio.news_post_events e LEFT JOIN trovio.users u ON u.id=e.actor_id
      WHERE e.post_id=$1 ORDER BY e.version DESC LIMIT 15`,[id]);
  },
  async save(input:NewsInput,actorId:string,id?:string,version?:number):Promise<NewsPost> {
    return withTransaction(async()=>{
      let previous:NewsPost|null=null;
      if(id) {
        await query('SELECT id FROM trovio.news_posts WHERE id=$1 FOR UPDATE',[id]);
        previous=await this.byId(id);
        if(!previous)throw new NewsError('Bài viết không tồn tại.',404);
        if(previous.version!==version)throw new NewsError('Bài đã được sửa ở phiên khác. Tải lại trang trước khi lưu để tránh ghi đè.',409);
        if(previous.publishedAt && previous.slug!==input.slug)throw new NewsError('Bài từng xuất bản phải giữ đường dẫn cũ.',400,'slug');
      }
      const values=[input.title,input.slug,input.summary,input.body,input.categoryCode,input.contentType,input.videoUrl,input.coverUrl,input.sourceUrl,input.season,input.status,actorId,input.bodyFormat??'plain'];
      let savedId:string;
      if(id) {
        values.push(id);
        const [saved]=await query<{id:string}>(`UPDATE trovio.news_posts SET title=$1,slug=$2,summary=$3,body=$4,category_code=$5,
          content_type=$6,video_url=$7,cover_url=$8,source_url=$9,season=$10,status=$11,updated_by=$12,body_format=$13,
          published_at=CASE WHEN $11='published' THEN COALESCE(published_at,now()) ELSE published_at END WHERE id=$14 RETURNING id`,values);
        savedId=saved.id;
      } else {
        const [saved]=await query<{id:string}>(`INSERT INTO trovio.news_posts(title,slug,summary,body,category_code,content_type,video_url,cover_url,source_url,season,status,created_by,updated_by,published_at,body_format)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,CASE WHEN $11='published' THEN now() ELSE NULL END,$13) RETURNING id`,values);
        savedId=saved.id;
      }
      const post=(await this.byId(savedId))!;
      await query(`INSERT INTO trovio.news_post_events(post_id,actor_id,version,action,previous_status,status)
        VALUES ($1,$2,$3,$4,$5,$6)`,[savedId,actorId,post.version,previous?'updated':'created',previous?.status??null,post.status]);
      return post;
    });
  },
};
