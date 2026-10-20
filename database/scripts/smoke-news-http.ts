/** Start a local production server and verify public routes and anonymous access boundaries. */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const base='http://127.0.0.1:3107';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3107'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let log='';
server.stdout.on('data',chunk=>{log+=chunk.toString();});
server.stderr.on('data',chunk=>{log+=chunk.toString();});
async function main(){
  try {
    let ready=false;
    for(let i=0;i<60;i++){
      if(server.exitCode!==null)throw new Error(`Test server exited: ${log.slice(-1000)}`);
      if(log.includes('Ready')){ready=true;break;}
      await delay(500);
    }
    assert.ok(ready,'Production server did not start');
    const page=await fetch(`${base}/tin-tuc`,{signal:AbortSignal.timeout(60000)});
    assert.equal(page.status,200);
    const html=await page.text();
    assert.ok(html.includes('Tin tức &amp; hướng dẫn'));
    assert.ok(html.includes('href="/tin-tuc"'));
    assert.ok(html.includes('Hướng dẫn nguyện vọng'));
    const missing=await fetch(`${base}/tin-tuc/does-not-exist-for-news-smoke`,{signal:AbortSignal.timeout(30000)});
    assert.equal(missing.status,404);
    const admin=await fetch(`${base}/quan-tri/tin-tuc`,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    assert.ok([302,303,307,308].includes(admin.status));
    assert.ok(admin.headers.get('location')?.includes('/dang-nhap'));
    const write=await fetch(`${base}/api/admin/news`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(write.status,401);
    const crossSite=await fetch(`${base}/api/admin/news`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://foreign.example'},body:'{}'});
    assert.equal(crossSite.status,403);
    console.log('PASS HTTP: news page/menu/categories, missing article 404, admin login redirect, anonymous write 401, cross-origin write 403.');
  }finally{
    server.kill();
    await Promise.race([new Promise(resolve=>server.once('exit',resolve)),delay(3000)]);
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
