/** Collect HTTPS logo URLs without saving image files.
 * npm run school-logos:collect -- [SCHOOL_CODE ...]
 */
import { stagingEntries, saveStagingEntry, closeStaging } from '../staging.ts';
try {

const websites = await stagingEntries('school-websites');
const overrides = await stagingEntries('school-logo-overrides');
const selected = process.argv.slice(2).map(code => code.toUpperCase());
for (const code of selected) {
  if (!websites[code]) throw new Error(`Unknown school code: ${code}`);
}
const entries = Object.entries(websites).filter(([code]) => !selected.length || selected.includes(code));
const logos = await stagingEntries('school-logos');
const results = Object.values(await stagingEntries('school-logo-results'));
if (!Object.keys(websites).length) throw new Error('No school websites in PostgreSQL staging. Import legacy data first.');

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const decode = value => value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'");
function absolute(value, base) {
  if (!value) return '';
  try {
    const url = new URL(decode(value), base);
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? match[4] ?? '')]));
}
function candidates(html, base) {
  const found = [];
  for (const [position, match] of [...html.matchAll(/<(?:img|link|meta)\b[^>]*>/gi)].entries()) {
    const a = attributes(match[0]);
    const isIcon = /^<link/i.test(match[0]) && /(?:^|\s)(?:icon|apple-touch-icon)(?:\s|$)/i.test(a.rel || '');
    const isMeta = /^<meta/i.test(match[0]) && /^(?:og:image|twitter:image)$/.test(a.property || a.name || '');
    if (!/^<img/i.test(match[0]) && !isIcon && !isMeta) continue;
    const src = absolute(isIcon ? a.href : isMeta ? a.content : a['data-original'] || a['data-src'] || a.src, base);
    const context = normalize(`${src} ${a.alt || ''} ${a.title || ''} ${a.class || ''} ${a.id || ''}`);
    if (!src || /facebook|zalo|youtube|tiktok|partner|doi[-_ ]tac|doanhnghiep|kiem-dinh|faculty_logos|mess-icon|bo-giao-duc/.test(context)) continue;
    const score = (isIcon ? 40 : 0) + (/logo/.test(context) ? 100 : 0) + (/header|brand/.test(context) ? 20 : 0)
      + (position < 30 ? 10 : 0) - (/footer|white|trang|banner/.test(context) ? 15 : 0);
    if (score >= 40) found.push({ src, score });
  }
  return [...new Map(found.sort((a, b) => b.score - a.score).map(item => [item.src, item])).values()];
}
async function verify(url) {
  try {
    // Inspect headers and cancel the body. No image file is downloaded or written.
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Trovio school logo URL collection' } });
    const type = response.headers.get('content-type') || '';
    await response.body?.cancel();
    return response.ok && response.url.startsWith('https://') && /^image\//i.test(type);
  } catch { return false; }
}
let next = 0;
async function worker() {
  while (next < entries.length) {
    const [code, website] = entries[next++];
    let choices = [overrides[code], logos[code]].filter(Boolean).map(src => ({ src }));
    let error;
    let url;
    for (const choice of choices) {
      if (absolute(choice.src, website) === choice.src && await verify(choice.src)) { url = choice.src; break; }
    }
    if (!url) {
      try {
        const response = await fetch(website, {
          signal: AbortSignal.timeout(20000),
          headers: { 'User-Agent': 'Trovio school logo URL collection' },
        });
        if (!response.ok) throw new Error(`Homepage HTTP ${response.status}`);
        const html = await response.text();
        choices = candidates(html, response.url).slice(0, 8);
        for (const choice of choices) {
          if (await verify(choice.src)) { url = choice.src; break; }
        }
        if (!url) error = 'No working HTTPS logo URL found';
      } catch (cause) { error = cause.message; }
    }
    const result = { code, website, ...(url ? { url } : { error }), candidates: choices.map(choice => choice.src) };
    if (url) { logos[code] = url; await saveStagingEntry('school-logos', code, url); }
    await saveStagingEntry('school-logo-results', code, result);
    const index = results.findIndex(item => item.code === code);
    if (index >= 0) results[index] = result; else results.push(result);
    console.log(`${code}: ${url || error}`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
const failed = results.filter(item => entries.some(([code]) => code === item.code) && !item.url);
console.log(`Verified ${entries.length - failed.length}/${entries.length} school logo URLs. No image files written.`);
if (failed.length) process.exitCode = 1;

} finally { await closeStaging(); }
