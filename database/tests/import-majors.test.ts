import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { repositories } from "../repositories";
import { importService } from "../../src/services/import.service";
import { unifiedEntryService } from "../../src/services/unified-entry.service";
import type { Major, Program, PublicUser, School } from "../../src/domain/types";

const actor = { id: "actor", email: "actor@example.test", name: "Actor" } as PublicUser;
const school: School = {id:'school-old',slug:'school',code:'ABC',name:'Trường ABC',shortName:'ABC',type:'cong-lap',region:'bac',city:'Hà Nội',campuses:['Hà Nội'],founded:0,students:0,highlight:'',website:'',logoUrl:null,description:'',scholarships:''};
const major: Major = {id:'major-old',slug:'it',code:'7480201',name:'Công nghệ thông tin',groupId:'cntt',riasec:['I','R','C'],summary:'',description:''};

test('import preview and publish agree for school codes, suffixes, ordinals and uncoded catalog majors', async (t) => {
  const commands: string[] = [];
  global.__pgPool = {connect:async()=>({query:async(sql:string)=>{commands.push(sql);return {rows:[]};},release:()=>{}})} as unknown as Pool;
  const majors = [major, {...major,id:'major-no-code',slug:'marketing',name:'Marketing',code:''}];
  const saved: Program[] = [];
  t.mock.method(repositories.catalogAdmin, 'listSchools', async () => [school]);
  t.mock.method(repositories.catalogAdmin, 'listMajors', async () => majors);
  t.mock.method(repositories.catalogAdmin, 'listPrograms', async () => []);
  t.mock.method(repositories.catalog, 'findCombos', async () => []);
  t.mock.method(repositories.majors, 'findGroups', async () => []);
  t.mock.method(repositories.catalogAdmin, 'createProgramsBatch', async (programs: Program[]) => {saved.push(...programs);});
  t.mock.method(repositories.importBatches, 'add', async () => {});
  t.mock.method(repositories.audit, 'append', async () => {});
  const codes = ['IT1', 'IT-E15', '7480201CL', '7480201.01', '1) 7480201', '(1) 7480201'];
  const rows = codes.map((code, i) => ({ma_truong:'ABC',ma_xet_tuyen:`IT${i}`,ma_nganh:code,ten_chuong_trinh:major.name}));
  rows.push({ma_truong:'ABC',ma_xet_tuyen:'7480201.01',ma_nganh:'7480201.01',ten_chuong_trinh:major.name});
  rows.push({ma_truong:'ABC',ma_xet_tuyen:'MKT',ma_nganh:'MKT',ten_chuong_trinh:'Marketing'});
  const preview = await importService.revalidate('test.csv', rows);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;
  assert.equal(preview.preview.summary.errors, 0);
  assert.deepEqual(preview.preview.rows.map(row => row.data.ma_nganh), [...codes.map(() => major.code), major.code, '']);
  const result = await importService.publish(actor, 'test.csv', preview.preview.rows.map(row => row.data));
  assert.equal(result.ok, true);
  assert.equal(saved.length, rows.length);
  assert.deepEqual(saved.map(program => program.majorId), [...codes.map(() => major.id), major.id, 'major-no-code']);
  assert.deepEqual(saved.map(program => program.admissionCode), rows.map(row => row.ma_xet_tuyen));
  assert.ok(commands.includes('COMMIT'));

  // A save-time validation failure remains a data error and rolls back the batch.
  t.mock.method(unifiedEntryService, 'save', async () => ({ok:false,status:400,field:'majorCode',message:'Mã ngành chưa xác định.'}));
  const failed = await importService.publish(actor, 'test.csv', rows);
  assert.equal(failed.ok, false);
  if (failed.ok) return;
  assert.equal(failed.status, 400);
  assert.match(failed.message, /Dòng 2 \(ABC \/ IT0\)/);
  assert.equal(commands.at(-1), 'ROLLBACK');
  assert.equal(saved.length, rows.length);
});

test('import reports unresolved and ambiguous school codes before publication', async (t) => {
  t.mock.method(repositories.catalogAdmin, 'listSchools', async () => [school]);
  t.mock.method(repositories.catalogAdmin, 'listMajors', async () => [major,{...major,id:'duplicate',code:'',slug:'duplicate'}]);
  t.mock.method(repositories.catalogAdmin, 'listPrograms', async () => []);
  t.mock.method(repositories.catalog, 'findCombos', async () => []);
  const result = await importService.revalidate('test.csv', [
    {ma_truong:'ABC',ma_xet_tuyen:'IT1',ma_nganh:'IT1',ten_chuong_trinh:major.name},
    {ma_truong:'ABC',ma_xet_tuyen:'OTHER',ma_nganh:'XYZ',ten_chuong_trinh:'Ngành chưa biết'},
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.preview.summary.errors, 2);
  assert.ok(result.preview.rows.every(row => row.errors.some(error => error.field === 'ma_nganh')));
});
