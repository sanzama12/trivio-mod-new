import { readMigration } from "./migration-source";
/** Isolated schema + repository integration. No public posts are created; always rolls back. */
import { config } from 'dotenv';
import { Client,type Pool } from 'pg';
import assert from 'node:assert/strict';
import { query,withTransaction } from '../client';
import { postgresNewsRepository as news } from '../repositories/postgres-news';
import { newsService } from '../../src/services/news.service';
import { newsFilter } from '../../src/services/news-validation';
import { NewsError,type NewsInput } from '../../src/domain/news';

config({path:'.env.local',quiet:true});
const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
const schema=`news_verify_${Date.now()}`;
const rollback={};
async function main(){
  await client.connect();
  // Exercise the actual repository against a separate schema on a single transaction.
  const adapter={query:(sql:string,args?:any[])=>client.query(sql.replaceAll('trovio.',`${schema}.`),args),release:()=>{}};
  global.__pgPool={connect:async()=>adapter} as unknown as Pool;
  try {
    await withTransaction(async()=>{
      await query(`CREATE SCHEMA ${schema}`);
      await query(`CREATE TABLE ${schema}.users(id TEXT PRIMARY KEY,name TEXT)`);
      await query(`INSERT INTO ${schema}.users VALUES ('test-editor','Test editor')`);
      const migration=readMigration('20261020_news_content.sql').replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'').replace(/\btrovio\b/g,schema);
      await query(migration);
      await query(readMigration('20261020_news_rich_text.sql').replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'').replace(/\btrovio\b/g,schema));
      const data:NewsInput={title:'Bài thử hướng dẫn tuyển sinh',slug:'bai-thu-tuyen-sinh',summary:'Hướng dẫn chuẩn bị các bước lập nguyện vọng.',body:'Đọc nguồn chính thức của chương trình để chuẩn bị hồ sơ.',categoryCode:'tuyen-sinh',contentType:'article',videoUrl:null,coverUrl:null,sourceUrl:null,season:2027,status:'draft'};
      const draft=await news.save(data,'test-editor');
      assert.match(draft.id,/^news-/);
      assert.equal(await news.publicBySlug(draft.slug),null);
      assert.equal((await news.list(newsFilter({}))).total,0);
      assert.equal((await news.list(newsFilter({}),true)).total,1);
      const published=await news.save({...data,status:'published'},'test-editor',draft.id,draft.version);
      assert.equal(published.version,2);
      assert.ok(published.publishedAt);
      assert.equal((await news.publicBySlug(published.slug))?.id,draft.id);
      assert.equal((await news.list(newsFilter({category:'tuyen-sinh',q:'hướng dẫn'}))).total,1);
      assert.equal((await news.list(newsFilter({type:'video'}))).total,0);
      await assert.rejects(()=>news.save({...data,status:'published'},'test-editor',draft.id,1),(e:unknown)=>e instanceof NewsError&&e.status===409);
      await assert.rejects(()=>news.save({...data,slug:'khac',status:'published'},'test-editor',draft.id,2),NewsError);
      const archived=await news.save({...data,status:'archived'},'test-editor',draft.id,published.version);
      assert.equal(await news.publicBySlug(draft.slug),null);
      const restored=await news.save({...data,status:'published'},'test-editor',draft.id,archived.version);
      assert.equal(restored.publishedAt,published.publishedAt);
      assert.equal((await news.history(draft.id)).length,4);
      const video=await newsService.save({id:'test-editor',admin:true},{data:{...data,slug:'video-nguyen-vong',contentType:'video',videoUrl:'https://youtu.be/dQw4w9WgXcQ',status:'published'}});
      assert.equal(video.videoUrl,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      const rich=await newsService.save({id:'test-editor',admin:true},{id:video.id,version:video.version,data:{...video,bodyFormat:'html',body:'<p style="font-family:Georgia;font-size:24px">Hướng dẫn nguyện vọng với nội dung định dạng.</p><script>alert(1)</script>'}});
      assert.equal(rich.bodyFormat,'html');
      assert.ok(rich.body.includes('font-size:24px'));
      assert.ok(!rich.body.includes('<script'));
      assert.equal((await news.list(newsFilter({type:'video'}))).total,1);
      const page=await news.list(newsFilter({page:'2'}));
      assert.equal(page.total,2);assert.equal(page.items.length,0);
      assert.equal('body' in (await news.list(newsFilter({}))).items[0],false);
      async function rejectsSql(sql:string,args:any[],code:string){
        await query('SAVEPOINT invalid_news');let failure:any;
        try{await query(sql,args);}catch(e){failure=e;}
        await query('ROLLBACK TO SAVEPOINT invalid_news');assert.equal(failure?.code,code);
      }
      await rejectsSql('UPDATE trovio.news_posts SET category_code=$1 WHERE id=$2',['missing',draft.id],'23503');
      await rejectsSql('UPDATE trovio.news_posts SET body=$1 WHERE id=$2',['',draft.id],'23514');
      await rejectsSql('INSERT INTO trovio.news_posts(slug,title,category_code,content_type) VALUES ($1,$2,$3,$4)',[draft.slug,data.title,'tuyen-sinh','article'],'23505');
      assert.equal((await news.history(draft.id)).length,4);
      console.log('PASS news migration, draft privacy, publication, archive/restore, pagination/filtering, optimistic locking, slug uniqueness, category FK, video canonicalization and audit.');
      throw rollback;
    });
  }catch(e){if(e!==rollback)throw e;}
  finally{await client.end();global.__pgPool=null;}
  console.log('ROLLBACK: isolated test schema removed; no runtime content was published.');
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});
