import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeUserData, sanitizeUserData } from '../../src/services/user-data.service';

test('recommendation preferences are bounded and reject malformed identifiers', () => {
  const data = sanitizeUserData({
    preferences: {
      groupIds: ['cntt', 'cntt', '../bad'],
      interestMajorIds: ['cong-nghe-thong-tin', '<script>'],
      strongSubjectIds: ['toan', 'ly'],
      useSavedBehavior: true,
      updatedAt: '2026-10-25T00:00:00.000Z',
    },
  });
  assert.deepEqual(data.preferences, {
    groupIds: ['cntt'],
    interestMajorIds: ['cong-nghe-thong-tin'],
    strongSubjectIds: ['toan', 'ly'],
    useSavedBehavior: true,
    updatedAt: '2026-10-25T00:00:00.000Z',
  });
});

test('newest recommendation preferences win during account merge', () => {
  const older = sanitizeUserData({ preferences: { groupIds: ['cntt'], interestMajorIds: [], strongSubjectIds: [], useSavedBehavior: false, updatedAt: '2026-10-24T00:00:00.000Z' } });
  const newer = sanitizeUserData({ preferences: { groupIds: ['kinh-te'], interestMajorIds: [], strongSubjectIds: ['toan'], useSavedBehavior: true, updatedAt: '2026-10-25T00:00:00.000Z' } });
  assert.deepEqual(mergeUserData(older, newer).preferences, newer.preferences);
});

test('recommendation preferences preserve academic performance, estimated score, combo, target regions and budget', () => {
  const data = sanitizeUserData({
    preferences: {
      groupIds: ['cntt'],
      interestMajorIds: ['cong-nghe-thong-tin'],
      strongSubjectIds: ['toan', 'tieng-anh'],
      useSavedBehavior: true,
      academicPerformance: 'gioi',
      estimatedScore: 25.5,
      estimatedCombo: 'A00',
      targetRegions: ['bac', 'nam'],
      budgetMax: 30,
      updatedAt: '2026-10-28T00:00:00.000Z',
    },
  });
  assert.deepEqual(data.preferences, {
    groupIds: ['cntt'],
    interestMajorIds: ['cong-nghe-thong-tin'],
    strongSubjectIds: ['toan', 'tieng-anh'],
    useSavedBehavior: true,
    academicPerformance: 'gioi',
    estimatedScore: 25.5,
    estimatedCombo: 'A00',
    targetRegions: ['bac', 'nam'],
    budgetMax: 30,
    updatedAt: '2026-10-28T00:00:00.000Z',
  });
});

