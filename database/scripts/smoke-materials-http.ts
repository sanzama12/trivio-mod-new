import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const base='http://127.0.0.1:3108';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3108'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',chunk=>logs+=chunk);server.stderr.on('data',chunk=>logs+=chunk);
async function main(){try{
  let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error(logs.slice(-1000));if(logs.includes('Ready')){ready=true;break;}await delay(500);}assert.ok(ready);
  const page=await fetch(`${base}/tai-lieu`,{signal:AbortSignal.timeout(60000)});assert.equal(page.status,200);const html=await page.text();
  assert.ok(html.includes('Tài liệu theo môn học'));assert.ok(html.includes('Chọn môn học'));assert.ok(html.includes('href="/tai-lieu"'));assert.ok(html.includes('subject=toan'));
  const math=await fetch(`${base}/tai-lieu?subject=toan&kind=pdf`,{signal:AbortSignal.timeout(30000)});assert.equal(math.status,200);assert.ok((await math.text()).includes('Toán'));
  assert.equal((await fetch(`${base}/tai-lieu/material-does-not-exist`)).status,404);
  const admin=await fetch(`${base}/quan-tri/tai-lieu`,{redirect:'manual'});assert.ok([302,303,307,308].includes(admin.status));assert.ok(admin.headers.get('location')?.includes('/dang-nhap'));
  const form=new FormData();form.set('payload','{}');assert.equal((await fetch(`${base}/api/admin/materials`,{method:'POST',body:form})).status,401);
  assert.equal((await fetch(`${base}/api/admin/materials`,{method:'POST',headers:{Origin:'https://foreign.example'},body:form})).status,403);
  assert.equal((await fetch(`${base}/api/materials/material-00000000-0000-4000-8000-000000000000/download`)).status,404);
  console.log('PASS HTTP: materials menu, subject labels, subject/PDF filters, detail 404, admin login redirect, upload 401/cross-origin 403, unavailable PDF 404.');
}finally{server.kill();await Promise.race([new Promise(resolve=>server.once('exit',resolve)),delay(3000)]);}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
