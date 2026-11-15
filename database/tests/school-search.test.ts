import { test } from "node:test";
import assert from "node:assert/strict";
import { repositories } from "../repositories";
import { programService } from "../../src/services/program.service";
import type { Major, Program, School } from "../../src/domain/types";
import { parseProgramFilters, serializeProgramFilters } from "../../src/services/program.filters";

const school = (id: string, region: School["region"] = "bac"): School => ({
  id, region, slug:id, code:id.toUpperCase(), name:`Trường ${id}`, shortName:id, type:"cong-lap", city:"Hà Nội",
  campuses:[], founded:0, students:0, highlight:"", website:"", logoUrl:null, description:"", scholarships:"",
});

test("score filters exclude higher and unknown cutoffs and match all conditions on one program", async (t) => {
  const schools = [school("a"), school("b"), school("c"), school("d"), school("e"), school("empty")];
  const programs = [
    program("a-exact", "a"),
    program("a-high", "a", { cutoffs: [{ year: 2026, score: 28 }] }),
    program("b-high", "b", { cutoffs: [{ year: 2026, score: 27 }] }),
    program("c-hocba", "c", { cutoffs: [], altCutoffs: [{ method: "hocba", year: 2026, score: 23 }] }),
    program("d-hocba", "d", { cutoffs: [{ year: 2026, score: 29 }], altCutoffs: [{ method: "hocba", year: 2026, score: 22 }] }),
    program("e-low-other-combo", "e", { combos: ["B00"], cutoffs: [{ year: 2026, score: 20 }] }),
    program("e-high-a00", "e", { cutoffs: [{ year: 2026, score: 27 }] }),
  ];
  t.mock.method(repositories.schools, "findAll", async () => schools);
  t.mock.method(repositories.majors, "findAll", async () => [major]);
  t.mock.method(repositories.programs, "findAll", async () => programs);

  const filters = { score: 24, combos: ["A00"], tuition: "15-30" as const };
  const result = await programService.searchSchools(filters);
  assert.deepEqual(result.items.map((item) => item.id), ["a"]);
  assert.equal(result.summaries.a.programCount, 1);
  assert.equal(result.summaries.a.cutoffMin, 24);
  assert.equal(result.summaries.a.cutoffMax, 24);
  assert.equal(result.summaries.a.featuredProgram?.slug, "a-exact");
  assert.equal((await programService.searchSchools({ score: 19 })).total, 0);

  const hocba = await programService.searchSchools({ score: 24, method: "hocba", sort: "ten" });
  assert.deepEqual(hocba.items.map((item) => item.id), ["c", "d"]);
  assert.equal(hocba.summaries.d.cutoffMax, 22);
  const programResults = await programService.search(filters);
  assert.deepEqual(programResults.items.map((item) => item.program.id), ["a-exact"]);
});

test("filter URLs preserve comma decimal scores and combined selections", () => {
  const filters = parseProgramFilters({ score: "26,5", combos: "A00,A01", groups: "giao-duc", regions: "nam", tuition: "15-30" });
  assert.equal(filters.score, 26.5);
  const params = new URLSearchParams(serializeProgramFilters(filters));
  assert.deepEqual(parseProgramFilters(Object.fromEntries(params)), filters);
});
const major: Major = {id:"it",slug:"it",code:"7480201",name:"Công nghệ thông tin",groupId:"cntt",riasec:[],summary:"",description:""};
const program = (id: string, schoolId: string, patch: Partial<Program> = {}): Program => ({
  id, schoolId, slug:id, majorId:major.id, name:"Công nghệ thông tin",admissionCode:id,trainingType:"Chính quy",campus:"",
  combos:["A00"],cutoffs:[{year:2026,score:24}],altCutoffs:[],tuitionMin:20,tuitionMax:25,durationYears:4,
  quota:100,competition:"Trung bình",methods:[],overview:"",updatedAt:"2026-11",source:"",...patch,
});

test("school filters use one matching program and paginate distinct schools", async (t) => {
  const schools = [school("a"),school("b"),school("c"),school("d","nam")];
  schools[2].code = "NOCOURSES";
  const programs = [program("a1","a"),program("a2","a"),
    program("b1","b",{combos:["B00"]}),program("b2","b",{tuitionMin:60,tuitionMax:70}),
    program("d1","d")];
  t.mock.method(repositories.schools,"findAll",async()=>schools);
  t.mock.method(repositories.majors,"findAll",async()=>[major]);
  t.mock.method(repositories.programs,"findAll",async()=>programs);

  const filtered = await programService.searchSchools({combos:["A00"],tuition:"15-30",regions:["bac"],groups:["cntt"]});
  assert.equal(filtered.total,1);
  assert.deepEqual(filtered.items.map(item=>item.id),["a"]);
  const all = await programService.searchSchools({sort:"ten",pageSize:2,page:2});
  assert.equal(all.total,4);
  assert.equal(all.pageCount,2);
  assert.deepEqual(all.items.map(item=>item.id),["c","d"]);
  const byName = await programService.searchSchools({q:"NOCOURSES"});
  assert.deepEqual(byName.items.map(item=>item.id),["c"]);
  const byMethod = await programService.searchSchools({method:"hocba"});
  assert.equal(byMethod.total,0);
  const byMajor = await programService.searchSchools({majors:[major.id]});
  assert.equal(byMajor.total,3);
  assert.equal(new Set(byMajor.items.map(item=>item.id)).size,byMajor.total);
});
