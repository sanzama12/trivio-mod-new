import { config } from "dotenv";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { repositories } from "../repositories";
import { getPool, query } from "../client";

config({path:'.env.local',quiet:true});
async function main() {
  try {
    const start=performance.now();
    const programs=await repositories.programs.findAll();
    const stats=await repositories.catalog.findDiscoveryStats();
    const admin=await repositories.catalogAdmin.listPrograms();
    const [counts]=await query<{all:number;visible:number;review:number;patches:number}>(`SELECT
      (SELECT count(*)::int FROM trovio.programs) AS all,
      (SELECT count(*)::int FROM trovio.public_programs) AS visible,
      (SELECT count(*)::int FROM trovio.major_code_review r JOIN trovio.majors m ON m.id=r.major_id WHERE m.code IS NULL) AS review,
      (SELECT count(*)::int FROM trovio.app_documents WHERE collection='program-patch') AS patches`);
    assert.equal(programs.length,counts.visible);
    assert.equal(stats.totalPrograms,counts.visible);
    assert.equal(admin.length,counts.all);
    assert.equal(counts.patches,0);
    const catalog=await repositories.catalog.findDiscoveryCatalog();
    assert.equal(catalog.stats.totalPrograms,counts.visible);
    assert.ok(catalog.majors.every(m=>typeof m.code==='string'));
    const sample=programs[0];
    if(sample) {
      assert.equal((await repositories.programs.findBySlug(sample.slug))?.id,sample.id);
      assert.equal((await repositories.catalogAdmin.getProgram(sample.id))?.id,sample.id);
      const guidance=await repositories.catalog.findGuidancePrograms(sample.majorId);
      const row=guidance.find(p=>p.id===sample.id);
      assert.ok(row);
      assert.equal(row.name,sample.name);
      assert.equal(row.tuitionMin,sample.tuitionMin);
      const warm=performance.now();
      await repositories.programs.findById(sample.id);
      console.log(`Warm ID lookup: ${(performance.now()-warm).toFixed(2)}ms (RAM; not page load time)`);
    }
    const dashboard=await repositories.adminDashboard.overviewCatalog();
    assert.equal(dashboard.programs.length,counts.all);
    console.log(JSON.stringify({ok:true,counts,readCheckMs:Math.round(performance.now()-start)}));
  } finally { await getPool().end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
