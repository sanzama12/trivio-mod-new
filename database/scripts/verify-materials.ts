import {config} from 'dotenv';
import {Client,type Pool} from 'pg';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {query,withTransaction} from '../client';
import {postgresMaterialsRepository as materials} from '../repositories/postgres-materials';
import {materialsService} from '../../src/services/materials.service';
import {materialFilter} from '../../src/services/material-validation';
import {MaterialError,type MaterialInput} from '../../src/domain/materials';
import {GET as downloadRoute} from '../../src/app/api/materials/[id]/download/route';
config({path:'.env.local',quiet:true});
const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
const schema=`materials_verify_${Date.now()}`;const rollback={};
async function main(){
 await client.connect();const adapter={query:(sql:string,args?:any[])=>client.query(sql.replaceAll('trovio.',`${schema}.`),args),release:()=>{}};global.__pgPool={connect:async()=>adapter} as unknown as Pool;
 try{await withTransaction(async()=>{
  await query(`CREATE SCHEMA ${schema}`);await query(`CREATE TABLE ${schema}.users(id TEXT PRIMARY KEY,name TEXT)`);await query(`CREATE TABLE ${schema}.subjects(id TEXT PRIMARY KEY,name TEXT)`);
  await query(`INSERT INTO ${schema}.users VALUES ('editor','Editor')`);await query(`INSERT INTO ${schema}.subjects VALUES ('toan','Toán'),('van','Ngữ văn')`);
  await query(readFileSync('database/migrations/20261020_learning_materials.sql','utf8').replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'').replace(/\btrovio\b/g,schema));
  const data:MaterialInput={title:'Tài liệu môn Toán thử nghiệm',slug:'toan-thu-nghiem',description:'Bài ôn tập theo môn.',subjectId:'toan',kind:'pdf',mediaUrl:null,status:'draft'};
  const actor={id:'editor',admin:true};const bytes=new TextEncoder().encode('%PDF-1.7\nTest fixture\n%%EOF\n');
  const draft=await materialsService.save(actor,{data},{bytes,name:'Đề Toán.pdf'});
  assert.equal((await materials.list(materialFilter({}))).total,0);assert.equal(await materials.download(draft.id),null);
  assert.equal((await materials.subjects()).find(s=>s.id==='toan')?.count,0);
  const published=await materialsService.save(actor,{id:draft.id,version:draft.version,data:{...data,status:'published'}});
  assert.equal((await materials.list(materialFilter({subject:'toan'}))).total,1);assert.equal((await materials.list(materialFilter({subject:'van'}))).total,0);
  assert.equal((await materials.publicBySlug(data.slug))?.id,draft.id);
  assert.equal((await materials.subjects()).find(s=>s.id==='toan')?.count,1);
  const request=new Request('http://localhost/api/materials/download');
  const response=await downloadRoute(request,{params:Promise.resolve({id:draft.id})});
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.ok(response.headers.get('content-disposition')?.includes("filename*=UTF-8''"));assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  await assert.rejects(()=>materials.save(data,actor.id,draft.id,1),(e:unknown)=>e instanceof MaterialError&&e.status===409);
  const replacement=new TextEncoder().encode('%PDF-1.7\nReplacement\n%%EOF\n');
  const replaced=await materialsService.save(actor,{id:draft.id,version:published.version,data:{...data,status:'published'}},{bytes:replacement,name:'New.pdf'});
  assert.equal((await query<{n:number}>('SELECT count(*)::int AS n FROM trovio.material_files'))[0].n,1);
  const archived=await materials.save({...data,status:'archived'},actor.id,draft.id,replaced.version);
  assert.equal((await downloadRoute(request,{params:Promise.resolve({id:draft.id})})).status,404);
  assert.equal(await materials.publicBySlug(data.slug),null);
  const image=await materialsService.save(actor,{id:draft.id,version:archived.version,data:{...data,kind:'image',status:'published',mediaUrl:'https://images.example.com/algebra.png'}});
  assert.equal((await query<{n:number}>('SELECT count(*)::int AS n FROM trovio.material_files'))[0].n,0);
  assert.equal((await materials.list(materialFilter({kind:'image'}))).total,1);
  assert.equal(await materials.download(image.id),null);
  const countBefore=(await query<{n:number}>('SELECT count(*)::int AS n FROM trovio.material_files'))[0].n;
  await query('SAVEPOINT failed_upload');let failed=false;
  try{await materialsService.save(actor,{data:{...data,status:'published'}},{bytes,name:'duplicate.pdf'});}catch{failed=true;}
  await query('ROLLBACK TO SAVEPOINT failed_upload');assert.ok(failed);assert.equal((await query<{n:number}>('SELECT count(*)::int AS n FROM trovio.material_files'))[0].n,countBefore);
  await assert.rejects(()=>materialsService.save(actor,{data:{...data,slug:'missing-file',status:'published'}}),MaterialError);
  assert.equal((await materials.list(materialFilter({page:'2'}))).items.length,0);
  assert.equal((await materials.list(materialFilter({}))).items.some(item=>'bytes' in item),false);
  console.log('PASS materials: subject labels/filtering, draft privacy, PDF upload/download headers and bytes, archive download 404, optimistic locking, file replacement cleanup, rollback without orphan files, image switching, pagination.');
  throw rollback;
 });}catch(e){if(e!==rollback)throw e;}finally{await client.end();global.__pgPool=null;}
 console.log('ROLLBACK complete; no test material retained or published.');
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});
