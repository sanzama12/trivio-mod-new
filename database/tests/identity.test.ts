import { test } from "node:test";
import assert from "node:assert/strict";
import { createId, isMajorCode } from "../identity";
import { findMajorForImport } from "../../src/services/major-mapping.service";
import type { Major } from "../../src/domain/types";

const major = (id:string,code:string,name:string): Major => ({id,code,name,slug:id,groupId:'cntt',riasec:['I','R','C'],summary:'',description:''});
test('entity identity uses the full UUID and does not embed display data',()=>{
  assert.match(createId('program'),/^prg-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(createId('major'),createId('major'));
  assert.equal(isMajorCode('7991234'),false);
  assert.equal(isMajorCode('7480201'),true);
});
test('specialisation name resolves to canonical major by code',()=>{
  const canonical=major('it','7480201','Công nghệ thông tin');
  assert.equal(findMajorForImport([canonical], 'Công nghệ thông tin chất lượng cao','7480201'),canonical);
});
test('does not choose arbitrary records for ambiguous legacy codes or names',()=>{
  const a=major('a','7480201','Công nghệ thông tin');
  const b=major('b','7480201','Chuyên ngành phần mềm');
  assert.equal(findMajorForImport([a,b],a.name,a.code),undefined);
  assert.equal(findMajorForImport([a,{...a,id:'other'}],a.name),undefined);
  assert.equal(findMajorForImport([a],a.name,'7340101'),undefined);
});
