import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../../src/app/api/v1/quiz/major-suggestions/route";
import { RIASEC_QUESTIONS } from "../../src/domain/riasec-questions";
import type { Major, MajorGroup } from "../../src/domain/types";
import { scoreAnswers } from "../../src/services/riasec.service";
import { repositories } from "../repositories";

const resultFor = (preferred: string) => scoreAnswers(Object.fromEntries(
  RIASEC_QUESTIONS.map((question) => [question.id, question.type === preferred ? 4 : 0]),
))!;
const request = (result: unknown) => new Request("http://localhost/api/v1/quiz/major-suggestions", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result }),
});

test("quiz API returns an existing major with its evidence basis", async (t) => {
  const group: MajorGroup = { id: "cntt", name: "Công nghệ thông tin", slug: "cntt", icon: "cpu", tone: "primary" };
  const major = { id: "it", slug: "cong-nghe-thong-tin", code: "7480201", name: "Công nghệ thông tin", groupId: "cntt", riasec: [], summary: "", description: "" } as Major;
  t.mock.method(repositories.catalog, "findDiscoveryCatalog", async () => ({
    groups: [group], majors: [major], schools: [],
    stats: { programCountByMajor: { it: 3 }, schoolCountByMajor: { it: 2 }, programCountByGroup: { cntt: 3 }, schoolCountByGroup: { cntt: 2 }, totalPrograms: 3, totalSchools: 2 },
  }));
  const response = await POST(request(resultFor("I")));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data[0].major.id, "it");
  assert.equal(body.data[0].basis, "group");
  assert.equal(body.data[0].programCount, 3);
});

test("quiz API rejects invalid results and does not rank a flat profile", async (t) => {
  const lookup = t.mock.method(repositories.catalog, "findDiscoveryCatalog", async () => { throw new Error("must not query catalog"); });
  assert.equal((await POST(request({ percents: {} }))).status, 400);
  const flat = scoreAnswers(Object.fromEntries(RIASEC_QUESTIONS.map((question) => [question.id, 2])))!;
  const response = await POST(request(flat));
  assert.deepEqual((await response.json()).data, []);
  assert.equal(lookup.mock.callCount(), 0);
});
