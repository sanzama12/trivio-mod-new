import assert from "node:assert/strict";
import test from "node:test";
import { RIASEC_ORDER } from "../../src/domain/riasec";
import { rankRiasecStudyGroups, suggestRiasecMajors } from "../../src/domain/riasec-guidance";
import { RIASEC_QUESTIONS } from "../../src/domain/riasec-questions";
import { matchMajor, sanitizeRiasec, sanitizeRiasecResult, scoreAnswers } from "../../src/services/riasec.service";
import { contentViewWeight, recordContentView, sanitizeContentViews, VIEW_RETENTION_MS } from "../../src/domain/browsing";
import { buildBrowsingAffinities, browsingBoost } from "../../src/services/behavior-recommendation";
import { mergeUserData, sanitizeUserData } from "../../src/services/user-data.service";
import { majorRecommendationService } from "../../src/services/major-recommendation.service";
import { repositories } from "../repositories";
import type { Major, MajorGroup, Program, RiasecType } from "../../src/domain/types";

const answersFor = (preferred: RiasecType) => Object.fromEntries(
  RIASEC_QUESTIONS.map((question) => [question.id, question.type === preferred ? 4 : 0]),
);

test("RIASEC has 60 unique items balanced across six dimensions and scores complete responses", () => {
  assert.equal(new Set(RIASEC_QUESTIONS.map((question) => question.id)).size, 60);
  for (const type of RIASEC_ORDER) {
    assert.equal(RIASEC_QUESTIONS.filter((question) => question.type === type).length, 10);
    const result = scoreAnswers(answersFor(type))!;
    assert.equal(result.code[0], type);
    assert.equal(result.percents[type], 100);
    assert.equal(result.answered, 60);
    assert.equal(result.isFlatProfile, false);
    assert.equal(matchMajor(result, { riasec: [type] }), 100);
  }
});

test("incomplete, fractional, and out-of-range answers cannot produce a result", () => {
  assert.equal(scoreAnswers({}), null);
  const answers = answersFor("R");
  delete answers.R1;
  assert.equal(scoreAnswers(answers), null);
  for (const value of [-1, 5, 1.5, NaN, Infinity]) {
    assert.equal(scoreAnswers({ ...answersFor("R"), R1: value }), null);
  }
});

test("uniform answers expose flat profiles and all tied dimensions without fabricated confidence", () => {
  const result = scoreAnswers(Object.fromEntries(RIASEC_QUESTIONS.map((question) => [question.id, 2])))!;
  assert.deepEqual(Object.values(result.percents), [50, 50, 50, 50, 50, 50]);
  assert.equal(result.isFlatProfile, true);
  assert.deepEqual(result.tiedDimensions, RIASEC_ORDER);
  assert.equal(result.confidenceScore, undefined);
});

test("study group guidance follows the six reported scores and does not rank a flat profile", () => {
  const groups = [
    { id: "kinh-te", name: "Kinh tế", riasec: ["E", "C", "S"] as [RiasecType, RiasecType, RiasecType] },
    { id: "giao-duc", name: "Giáo dục", riasec: ["S", "A", "I"] as [RiasecType, RiasecType, RiasecType] },
    { id: "cntt", name: "Công nghệ thông tin", riasec: ["I", "R", "C"] as [RiasecType, RiasecType, RiasecType] },
  ];
  const profile = { percents: { R: 40, I: 67.5, A: 30, S: 65, E: 67.5, C: 62.5 }, isFlatProfile: false };
  const ranked = rankRiasecStudyGroups(profile, groups);
  assert.deepEqual(ranked.map((item) => item.id), ["kinh-te", "cntt", "giao-duc"]);
  assert.equal(ranked[0].score, 65.4);
  assert.deepEqual(rankRiasecStudyGroups({ ...profile, isFlatProfile: true }, groups), []);
});

test("untrusted result codes are recomputed, malformed scores rejected, and legacy results accepted", () => {
  const result = scoreAnswers(answersFor("S"))!;
  assert.equal(sanitizeRiasec({ ...result, code: ["R", "R", "<script>"] })?.code[0], "S");
  assert.equal(sanitizeRiasec({ ...result, percents: { ...result.percents, S: 101 } }), null);
  assert.equal(sanitizeRiasecResult({ ...result, answered: 59 }), null);
  assert.equal(sanitizeRiasecResult({ ...result, completedAt: "invalid" }), null);
  const { questionCount, scoringModelVersion, assessmentVersion, ...legacy } = result;
  assert.equal(sanitizeRiasecResult(legacy)?.assessmentVersion, "legacy");
});

test("account merges retain the newest completed RIASEC result and old accounts remain usable", () => {
  const older = { ...scoreAnswers(answersFor("I"))!, completedAt: "2026-10-01T00:00:00.000Z" };
  const newer = { ...scoreAnswers(answersFor("A"))!, completedAt: "2026-11-01T00:00:00.000Z" };
  const server = sanitizeUserData({ riasec: older });
  const local = sanitizeUserData({ riasec: newer });
  assert.equal(mergeUserData(server, local).riasec?.code[0], "A");
  assert.equal(mergeUserData(local, server).riasec?.code[0], "A");
  assert.equal(mergeUserData(local, sanitizeUserData({})).riasec?.code[0], "A");
  assert.equal(sanitizeUserData({}).riasec, null);
});

test("repeat views increase interest while rapid remounts, expired and invalid entries are excluded", () => {
  const now = Date.now();
  const initial = recordContentView([], "major_view", "it", now);
  assert.equal(recordContentView(initial, "major_view", "it", now + 1000)[0].count, 1);
  const repeated = recordContentView(initial, "major_view", "it", now + 60_000);
  assert.equal(repeated[0].count, 2);
  assert.ok(contentViewWeight(repeated[0], now + 60_000) > contentViewWeight(initial[0], now + 60_000));
  assert.ok(contentViewWeight(initial[0], now + 14 * 86400_000) < contentViewWeight(initial[0], now));
  assert.deepEqual(sanitizeContentViews([
    { kind: "major_view", id: "it", count: 1, lastViewedAt: now - VIEW_RETENTION_MS - 1 },
    { kind: "major_view", id: "../bad", count: 1, lastViewedAt: now },
    { kind: "major_view", id: "future", count: 1, lastViewedAt: now + 1 },
    { kind: "other", id: "it", count: 1, lastViewedAt: now },
  ], now), []);
  assert.equal(sanitizeContentViews(Array.from({ length: 100 }, (_, index) => ({ kind: "major_view", id: `m${index}`, count: 999, lastViewedAt: now })), now).length, 60);
  assert.ok(browsingBoost(10000) < 24);
});

const group: MajorGroup = { id: "technology", name: "Công nghệ", slug: "technology", icon: "cpu", tone: "primary" };
const major = (id: string, type: RiasecType, groupId = group.id): Major => ({
  id, slug: id, code: "", name: id, groupId, riasec: [type], summary: "", description: "",
});
const program = (id: string, majorId: string): Program => ({
  id, majorId, schoolId: "school", slug: id, name: id, admissionCode: id, trainingType: "Chính quy",
  campus: "", combos: [], cutoffs: [], altCutoffs: [], tuitionMin: 0, tuitionMax: 0, durationYears: 4,
  quota: 0, competition: "Trung bình", methods: [], overview: "", updatedAt: "", source: "",
});

test("quiz suggests real majors from supported interest groups without inventing exact fit", () => {
  const result = scoreAnswers(answersFor("I"))!;
  const groups = [
    { id: "technology", name: "Công nghệ", riasec: ["I", "R", "C"] as [RiasecType, RiasecType, RiasecType] },
    { id: "engineering", name: "Kỹ thuật", riasec: ["R", "I", "C"] as [RiasecType, RiasecType, RiasecType] },
    { id: "social", name: "Xã hội", riasec: ["S", "A", "E"] as [RiasecType, RiasecType, RiasecType] },
  ];
  const majors = [major("curated", "I"), { ...major("group-only", "I"), riasec: [] }, major("unavailable", "I"), major("engineering", "R", "engineering"), major("social", "S", "social")];
  const items = suggestRiasecMajors(result, groups, majors, {
    programCountByMajor: { curated: 2, "group-only": 3, unavailable: 0, engineering: 5, social: 4 },
  });
  assert.deepEqual(items.map((item) => item.major.id), ["curated", "group-only"]);
  assert.deepEqual(items.map((item) => item.basis), ["major", "group"]);
  assert.equal(items[0].interestIndex, 100);
  assert.deepEqual(suggestRiasecMajors({ ...result, isFlatProfile: true }, groups, majors, { programCountByMajor: { curated: 2 } }), []);
});

test("school views distribute bounded interest across their majors and program views map to the actual major", () => {
  const now = Date.now();
  const majors = [major("a", "I"), major("b", "I")];
  const programs = [program("a1", "a"), program("a2", "a"), program("b1", "b")];
  const school = buildBrowsingAffinities([{ kind: "school_view", id: "school", count: 1, lastViewedAt: now }], majors, programs, now);
  assert.equal(school.majorWeights.get("a"), school.majorWeights.get("b"));
  assert.equal(school.groupWeights.get(group.id), 0.5);
  const direct = buildBrowsingAffinities([{ kind: "program_view", id: "b1", count: 1, lastViewedAt: now }], majors, programs, now);
  assert.equal(direct.majorWeights.get("b"), 1);
  assert.equal(direct.majorWeights.has("a"), false);
});

test("recommendations use quiz scores, promote repeatedly viewed related content, and preserve raw ranking above 100", async (t) => {
  const majors = [major("a", "I"), major("b", "I"), major("social", "S", "social")];
  const groups = [group, { ...group, id: "social", slug: "social", name: "Xã hội" }];
  t.mock.method(repositories.catalog, "findDiscoveryCatalog", async () => ({
    groups, majors, schools: [],
    stats: { programCountByMajor: {}, programCountByGroup: {}, schoolCountByGroup: {}, totalPrograms: 0, totalSchools: 0 },
  }));
  t.mock.method(repositories.programs, "findAll", async () => []);
  t.mock.method(repositories.catalog, "findCombos", async () => []);
  t.mock.method(repositories.catalog, "findSubjects", async () => []);
  t.mock.method(repositories.interests, "list", async () => []);
  t.mock.method(repositories.interests, "listSubjectLinks", async () => []);
  t.mock.method(repositories.majorCareers, "getMany", async () => []);
  const base = { groupIds: [], interestMajorIds: [], strongSubjectIds: [], behaviorProgramIds: [] };
  const quiz = await majorRecommendationService.recommend({ ...base, riasec: scoreAnswers(answersFor("S")) });
  assert.equal(quiz[0].major.id, "social");
  const input = { ...base, groupIds: [group.id], interestMajorIds: ["a", "b"], riasec: scoreAnswers(answersFor("I")) };
  const baseline = await majorRecommendationService.recommend(input);
  assert.equal(baseline[0].major.id, "a");
  const promoted = await majorRecommendationService.recommend({
    ...input, contentViews: [{ kind: "major_view", id: "b", count: 10, lastViewedAt: Date.now() }],
  });
  assert.equal(promoted[0].major.id, "b");
  assert.ok(promoted[0].reasons.some((reason) => reason.includes("thường xem")));
  assert.equal("rankingScore" in promoted[0], false);
  assert.deepEqual(await majorRecommendationService.recommend(base), []);
});
