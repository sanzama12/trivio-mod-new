import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { invalidatePostgresCache, postgresProgramRepository } from "../repositories/postgres";

test('an old in-flight read cannot repopulate cache after a committed edit',async()=>{
  let finishOld!: (value: any) => void;
  let calls=0;
  const bundle=(name:string)=>({rows:[{programs:[{id:'p',slug:'p',schoolId:'s',majorId:'m',name,source:'',tuitionMin:0,tuitionMax:0}],combos:[],methods:[],cutoffs:[],verified:[]}]});
  global.__pgPool={query:async()=>{
    calls++;
    if(calls===1) return new Promise(resolve=>{finishOld=resolve;});
    return bundle('Updated');
  }} as unknown as Pool;
  invalidatePostgresCache();
  const old=postgresProgramRepository.findById('p');
  invalidatePostgresCache();
  assert.equal((await postgresProgramRepository.findById('p'))?.name,'Updated');
  finishOld(bundle('Old'));
  await old;
  assert.equal((await postgresProgramRepository.findById('p'))?.name,'Updated');
  assert.equal(calls,2);
});
