import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { afterCommit, query, withAtomicResult, withTransaction } from "../client";
import { unifiedEntryService, type UnifiedEntryContext } from "../../src/services/unified-entry.service";
import type { PublicUser } from "../../src/domain/types";

const commands: string[]=[];
const fakeClient={ query: async(sql:string)=>{commands.push(sql);return {rows:[]};}, release:()=>commands.push('RELEASE') };
global.__pgPool={connect:async()=>fakeClient} as unknown as Pool;

test('nested repository writes share one transaction; failed workflow rolls back', async()=>{
  commands.length=0;
  let invalidated=false;
  const result=await withAtomicResult(async()=>{
    await withTransaction(async()=>{await query('write');afterCommit(()=>{invalidated=true;});});
    return {ok:false as const};
  });
  assert.equal(result.ok,false);
  assert.deepEqual(commands,['BEGIN','write','ROLLBACK','RELEASE']);
  assert.equal(invalidated,false);
});
test('successful commit invalidates once after database commit',async()=>{
  commands.length=0;
  const invalidate=()=>commands.push('INVALIDATE');
  await withTransaction(async()=>{afterCommit(invalidate);await withTransaction(async()=>afterCommit(invalidate));});
  assert.deepEqual(commands,['BEGIN','COMMIT','INVALIDATE','RELEASE']);
});
test('reimporting renamed program reuses school/code identity without creating extra majors',async()=>{
  const ctx:UnifiedEntryContext={
    schools:[{id:'school-old',slug:'school',code:'ABC',name:'Trường ABC',shortName:'ABC',type:'cong-lap',region:'bac',city:'Hà Nội',campuses:['Hà Nội'],founded:0,students:0,highlight:'',website:'',logoUrl:null,description:'',scholarships:''}],
    majors:[{id:'major-old',slug:'it',code:'7480201',name:'Công nghệ thông tin',groupId:'cntt',riasec:['I','R','C'],summary:'',description:''}],
    programs:[],schoolsToSave:[],majorsToSave:[],programsToInsert:[],skipAudit:true,
  };
  const actor={id:'actor',email:'actor@example.test',name:'Actor'} as PublicUser;
  const first=await unifiedEntryService.save(actor,{schoolCode:'ABC',majorName:'Công nghệ thông tin chất lượng cao',majorCode:'7480201',admissionCode:'IT1'},ctx);
  assert.equal(first.ok,true);
  const second=await unifiedEntryService.save(actor,{schoolCode:'ABC',majorName:'Tên chương trình mới',admissionCode:'IT1',score:22,year:2025},ctx);
  assert.equal(second.ok,true);
  assert.equal(ctx.programs.length,1);
  assert.equal(ctx.majorsToSave?.length,0);
  assert.equal(ctx.programs[0].majorId,'major-old');
  assert.equal(ctx.programs[0].name,'Tên chương trình mới');
  assert.deepEqual(ctx.programs[0].cutoffs,[{year:2025,score:22}]);
  const failed=await unifiedEntryService.save(actor,{schoolCode:'ABC',majorName:'Ngành chưa rõ',admissionCode:'OTHER'},ctx);
  assert.equal(failed.ok,false);
  assert.equal(ctx.programs.length,1);
});
