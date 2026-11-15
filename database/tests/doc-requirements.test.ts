import assert from 'node:assert/strict';
import test from 'node:test';
import { cutoffTrend } from '../../src/lib/trend';
import { validateYearRows } from '../../src/services/program-year.service';
import { slugifyInterest, validateCareerInfo, validateInterest } from '../../src/services/interest.service';
import { matchAiSource, validateAiSource } from '../../src/services/ai-source.service';
import { sanitizeUserData } from '../../src/services/user-data.service';

test('year data keeps every submitted year, even unchanged ones, and rejects bad input', () => {
  const ok = validateYearRows('p1', [
    { year: 2026, tuitionMin: '20', tuitionMax: 25, quota: '100', status: 'dang-tuyen', note: ' ' },
    { year: 2025, tuitionMin: 20, tuitionMax: 25, quota: 100, status: 'dang-tuyen' },
  ]);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.rows.map((r) => [r.year, r.quota, r.tuitionMin]), [[2026, 100, 20], [2025, 100, 20]]);

  assert.equal(validateYearRows('p1', []).ok, false);
  assert.equal(validateYearRows('p1', [{ year: 2026 }, { year: 2026 }]).ok, false, 'duplicate year');
  assert.equal(validateYearRows('p1', [{ year: 1999 }]).ok, false, 'year out of range');
  assert.equal(validateYearRows('p1', [{ year: 2026, tuitionMin: 30, tuitionMax: 20 }]).ok, false, 'max below min');
  assert.equal(validateYearRows('p1', [{ year: 2026, status: 'khac' }]).ok, false, 'unknown status');
  assert.equal(validateYearRows('p1', [{ year: 2026, quota: -1 }]).ok, false, 'negative quota');
});

test('interest input is normalised and bounded', () => {
  assert.equal(slugifyInterest('Lập trình & Game'), 'lap-trinh-game');
  const ok = validateInterest({ name: '  Lập   trình ', kind: 'interest', majorIds: ['cntt', 'cntt', '../bad'] });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.id, 'lap-trinh');
    assert.deepEqual(ok.majorIds, ['cntt']);
  }
  assert.equal(validateInterest({ name: 'a', kind: 'interest' }).ok, false);
  assert.equal(validateInterest({ name: 'Hợp lệ', kind: 'khac' }).ok, false);
});

test('major career info enforces limits and de-duplicates positions', () => {
  const ok = validateCareerInfo('cntt', { knowledge: 'Lập trình', careerOrientation: 'Kỹ sư', careers: 'Dev\nDev\n  QA \n' });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.value.careers, ['Dev', 'QA']);
  assert.equal(validateCareerInfo('cntt', { knowledge: 'x'.repeat(2001) }).ok, false);
  assert.equal(validateCareerInfo('cntt', { careers: Array.from({ length: 13 }, (_, i) => `n${i}`) }).ok, false);
});

test('AI sources need keywords and https links, and only matching questions are answered', () => {
  assert.equal(validateAiSource({ title: 'Ký túc xá', kind: 'faq', content: 'Có', keywords: '' }).ok, false);
  assert.equal(validateAiSource({ title: 'Ký túc xá', kind: 'link', content: 'Có', keywords: 'ktx' }).ok, false, 'link kind needs url');
  assert.equal(validateAiSource({ title: 'Ký túc xá', kind: 'faq', content: 'Có', keywords: 'ktx', url: 'http://x.vn' }).ok, false, 'http rejected');
  const sources = [
    { title: 'Ký túc xá', keywords: 'ký túc xá, nội trú', enabled: true },
    { title: 'Học bổng', keywords: 'học bổng khuyến khích', enabled: false },
  ];
  assert.equal(matchAiSource('Trường có ký túc xá cho sinh viên không?', sources)?.title, 'Ký túc xá');
  assert.equal(matchAiSource('Học bổng khuyến khích thế nào', sources), null, 'disabled source is ignored');
  assert.equal(matchAiSource('Giá bitcoin hôm nay', sources), null, 'unrelated question gets no source');
});

test('cutoff trend describes past changes and needs at least two years', () => {
  assert.equal(cutoffTrend([{ year: 2026, score: 25 }]).direction, 'chua-du-du-lieu');
  const up = cutoffTrend([{ year: 2026, score: 26.5 }, { year: 2024, score: 25 }, { year: 2025, score: 25.5 }]);
  assert.equal(up.direction, 'tang');
  assert.equal(up.totalChange, 1.5);
  assert.equal(up.latestChange, 1);
  assert.deepEqual(up.points.map((p) => p.year), [2024, 2025, 2026]);
  assert.equal(cutoffTrend([{ year: 2025, score: 25 }, { year: 2026, score: 25.1 }]).direction, 'on-dinh');
  assert.equal(cutoffTrend([{ year: 2025, score: 27 }, { year: 2026, score: 26 }]).direction, 'giam');
});

test('interest ids are kept in recommendation preferences only when valid', () => {
  const data = sanitizeUserData({ preferences: { groupIds: [], interestMajorIds: [], strongSubjectIds: [], interestIds: ['lap-trinh', '<x>'], useSavedBehavior: false, updatedAt: '2026-11-01T00:00:00.000Z' } });
  assert.deepEqual(data.preferences?.interestIds, ['lap-trinh']);
  const none = sanitizeUserData({ preferences: { groupIds: [], interestMajorIds: [], strongSubjectIds: [], useSavedBehavior: false, updatedAt: '2026-11-01T00:00:00.000Z' } });
  assert.equal(none.preferences?.interestIds, undefined);
});

test('import status column understands Vietnamese labels and rejects unknown text', async () => {
  const { parseAdmissionStatus } = await import('../../src/services/import.service');
  assert.equal(parseAdmissionStatus('Đang tuyển sinh'), 'dang-tuyen');
  assert.equal(parseAdmissionStatus('tạm dừng tuyển sinh'), 'tam-dung');
  assert.equal(parseAdmissionStatus('Ngừng tuyển sinh'), 'ngung-tuyen');
  assert.equal(parseAdmissionStatus('Chưa công bố'), 'chua-cong-bo');
  assert.equal(parseAdmissionStatus(''), null);
  assert.equal(parseAdmissionStatus('có thể'), undefined);
});

test('import turns rows into per-year data and keeps old values for blank cells', async () => {
  const { collectYearPatches, mergeYearData } = await import('../../src/services/import.service');
  const patches = collectYearPatches([
    { data: { nam: '2026', hoc_phi_min: '20', hoc_phi_max: '25', chi_tieu: '120', trang_thai: 'Đang tuyển sinh' } },
    { data: { nam: '2025', hoc_phi_min: '', hoc_phi_max: '', chi_tieu: '100', trang_thai: '' } },
    { data: { nam: '2024', hoc_phi_min: '', hoc_phi_max: '', chi_tieu: '', trang_thai: '' } },
  ]);
  assert.deepEqual([...patches.keys()].sort(), [2025, 2026], 'rows without year data are skipped');
  const merged = mergeYearData('p1', patches, [
    { programId: 'p1', year: 2025, tuitionMin: 18, tuitionMax: 22, quota: 90, status: 'tam-dung', note: 'giữ' },
  ]);
  const y25 = merged.find((r) => r.year === 2025)!;
  assert.deepEqual([y25.tuitionMin, y25.tuitionMax, y25.quota, y25.status, y25.note], [18, 22, 100, 'tam-dung', 'giữ']);
  const y26 = merged.find((r) => r.year === 2026)!;
  assert.deepEqual([y26.tuitionMin, y26.tuitionMax, y26.quota, y26.status], [20, 25, 120, 'dang-tuyen']);
});
