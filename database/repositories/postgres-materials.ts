import {query,withTransaction} from '@database/client';
import {MaterialError,type Material,type MaterialInput,type MaterialFilter,type MaterialList,type MaterialSubject} from '@/domain/materials';
const cols=`m.id,m.title,m.slug,m.description,m.subject_id AS "subjectId",s.name AS "subjectName",m.kind,m.media_url AS "mediaUrl",m.status,m.version,m.published_at::text AS "publishedAt",m.updated_at::text AS "updatedAt",f.filename AS "fileName",octet_length(f.bytes) AS "fileSize"`;
const joins=`JOIN trovio.subjects s ON s.id=m.subject_id LEFT JOIN trovio.material_files f ON f.id=m.pdf_file_id`;
export const postgresMaterialsRepository={
  subjects:()=>query<MaterialSubject>(`SELECT s.id,s.name,count(m.id)::int AS count FROM trovio.subjects s LEFT JOIN trovio.published_materials m ON m.subject_id=s.id GROUP BY s.id ORDER BY s.name`),
  async list(filter:MaterialFilter,admin=false):Promise<MaterialList>{
    const params:unknown[]=[];const where=['true'];
    const add=(sql:string,v:unknown)=>{params.push(v);where.push(sql.replace('?',`$${params.length}`));};
    if(filter.subject)add('m.subject_id=?',filter.subject);
    if(filter.kind)add('m.kind=?',filter.kind);
    if(admin&&filter.status)add('m.status=?',filter.status);
    if(filter.q)add("strpos(lower(m.title||' '||m.description),lower(?))>0",filter.q);
    const pageSize=admin?20:12;params.push(pageSize,(filter.page-1)*pageSize);
    const order=admin?'"updatedAt" DESC,id':'"publishedAt" DESC,id';
    const [row]=await query<{items:Material[];total:number}>(`WITH matching AS (SELECT ${cols} FROM ${admin?'trovio.learning_materials':'trovio.published_materials'} m ${joins} WHERE ${where.join(' AND ')})
      SELECT (SELECT count(*)::int FROM matching) AS total,COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY ${order}) FROM (SELECT * FROM matching ORDER BY ${order} LIMIT $${params.length-1} OFFSET $${params.length}) r),'[]'::jsonb) AS items`,params);
    return {...row,page:filter.page,pageSize};
  },
  async byId(id:string):Promise<Material|null>{return (await query<Material>(`SELECT ${cols} FROM trovio.learning_materials m ${joins} WHERE m.id=$1`,[id]))[0]??null;},
  async publicBySlug(slug:string):Promise<Material|null>{return (await query<Material>(`SELECT ${cols} FROM trovio.published_materials m ${joins} WHERE m.slug=$1`,[slug]))[0]??null;},
  async download(id:string){return (await query<{bytes:Buffer;filename:string}>(`SELECT f.bytes,f.filename FROM trovio.published_materials m JOIN trovio.material_files f ON f.id=m.pdf_file_id WHERE m.id=$1 AND m.kind='pdf'`,[id]))[0]??null;},
  async save(data:MaterialInput,actorId:string,id?:string,version?:number,file?:{bytes:Uint8Array;filename:string}):Promise<Material>{
    return withTransaction(async()=>{
      let old:{id:string;version:number;slug:string;published_at:Date|null;pdf_file_id:string|null}|undefined;
      if(id){old=(await query<any>('SELECT id,version,slug,published_at,pdf_file_id FROM trovio.learning_materials WHERE id=$1 FOR UPDATE',[id]))[0];if(!old)throw new MaterialError('Tài liệu không tồn tại.',404);if(old.version!==version)throw new MaterialError('Tài liệu đã thay đổi. Tải lại trang để tránh ghi đè.',409);if(old.published_at&&old.slug!==data.slug)throw new MaterialError('Giữ đường dẫn của tài liệu đã từng đăng.');}
      let fileId=data.kind==='pdf'?old?.pdf_file_id??null:null;
      if(file){if(data.kind!=='pdf')throw new MaterialError('Chỉ đính kèm file khi chọn PDF.');fileId=(await query<{id:string}>('INSERT INTO trovio.material_files(filename,bytes) VALUES ($1,$2) RETURNING id',[file.filename,Buffer.from(file.bytes)]))[0].id;}
      if(data.status==='published'&&data.kind==='pdf'&&!fileId)throw new MaterialError('Chọn file PDF trước khi đăng.');
      const values:unknown[]=[data.title,data.slug,data.description,data.subjectId,data.kind,data.mediaUrl,fileId,data.status,actorId];
      let savedId:string;
      if(id){values.push(id);savedId=(await query<{id:string}>(`UPDATE trovio.learning_materials SET title=$1,slug=$2,description=$3,subject_id=$4,kind=$5,media_url=$6,pdf_file_id=$7,status=$8,updated_by=$9,published_at=CASE WHEN $8='published' THEN COALESCE(published_at,now()) ELSE published_at END WHERE id=$10 RETURNING id`,values))[0].id;}
      else savedId=(await query<{id:string}>(`INSERT INTO trovio.learning_materials(title,slug,description,subject_id,kind,media_url,pdf_file_id,status,created_by,updated_by,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,CASE WHEN $8='published' THEN now() ELSE NULL END) RETURNING id`,values))[0].id;
      const result=(await this.byId(savedId))!;
      await query('INSERT INTO trovio.material_events(material_id,actor_id,version,status) VALUES ($1,$2,$3,$4)',[savedId,actorId,result.version,result.status]);
      if(old?.pdf_file_id&&old.pdf_file_id!==fileId)await query('DELETE FROM trovio.material_files WHERE id=$1',[old.pdf_file_id]);
      return result;
    });
  },
};
