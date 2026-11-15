import fs from 'node:fs/promises';
import sharp from 'sharp';
const profiles = JSON.parse(await fs.readFile('scratch/school-profile-candidates.json','utf8'));
const overrides = JSON.parse(await fs.readFile('database/data/school-logo-overrides.json','utf8'));
let results = JSON.parse(await fs.readFile('scratch/school-logo-results.json','utf8').catch(()=>'[]'));
const requested = process.argv.slice(2);
const queue = profiles.filter(p=>!requested.length || requested.includes(p.code));
await fs.mkdir('public/images/schools',{recursive:true});
let next=0;
async function worker() {
  while(next<queue.length) {
    const p=queue[next++];
    const sources=overrides[p.code] ? [{src:overrides[p.code],score:1000}] : [...(p.home?.images||[]),...(p.about?.images||[])];
    const candidates=[];
    for (const source of [...new Map(sources.map(s=>[s.src,s])).values()].slice(0,5)) {
      if (/tiktok|mess-icon|facebook|faculty_logos|doanhnghiep|kiem-dinh|tap-doan/i.test(source.src)) continue;
      try {
        const response=await fetch(source.src,{signal:AbortSignal.timeout(15000)});
        if(!response.ok) continue;
        const bytes=Buffer.from(await response.arrayBuffer());
        if(bytes.length>5_000_000) continue;
        const metadata=await sharp(bytes,{limitInputPixels:25_000_000}).metadata();
        if(!metadata.width||!metadata.height||Math.min(metadata.width,metadata.height)<24||metadata.width/metadata.height>30) continue;
        const rank=source.score*100-Math.abs(Math.log(metadata.width/metadata.height));
        candidates.push({source:source.src,bytes,rank,width:metadata.width,height:metadata.height});
      }catch{}
    }
    candidates.sort((a,b)=>b.rank-a.rank);
    let result={code:p.code,error:'No verified downloadable logo candidate'};
    if(candidates.length) {
      const best=candidates[0];
      const file=`public/images/schools/${p.code}.png`;
      await sharp(best.bytes).rotate().resize({width:600,height:600,fit:'inside',withoutEnlargement:true}).png().toFile(file);
      result={code:p.code,path:`/images/schools/${p.code}.png`,source:best.source,width:best.width,height:best.height};
    }
    const i=results.findIndex(r=>r.code===p.code);if(i>=0)results[i]=result;else results.push(result);
    console.log(`${p.code}: ${result.error||`${result.width}x${result.height} ${result.source}`}`);
  }
}
await Promise.all(Array.from({length:6},worker));
await fs.writeFile('scratch/school-logo-results.json',JSON.stringify(results,null,2));
