import { config } from "dotenv";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { repositories } from "../repositories";
import { getPool, query } from "../client";
import { recommendationService } from "../../src/services/recommendation.service";

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
    await repositories.adminDashboard.badges();
    await repositories.users.list();
    const recommendations = await recommendationService.recommend({ score: { method: 'thpt', total: 25, combo: 'A00' } });
    assert.ok(recommendations.items.length > 0, 'Recommendations must work after database configuration is removed');
    const [retired] = await query<{ count: number }>(`SELECT count(*)::int AS count FROM information_schema.tables
      WHERE table_schema IN ('trovio', 'trovio_archive') AND table_name IN
      ('news_posts', 'news_post_events', 'news_categories', 'news_articles', 'recommend_weights', 'recommend_rules', 'recommend_rule_params', 'timeline_config', 'timeline_events', 'deadline_reminders', 'reminder_log')`);
    assert.equal(retired.count, 0);
    console.log('PASS retired tables removed, admin navigation, user reads and default recommendations');
    console.log(JSON.stringify({ok:true,counts,readCheckMs:Math.round(performance.now()-start)}));
  } finally { await getPool().end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
