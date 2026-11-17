/** Inspect remote logo resolution and suggest official alternatives. Never saves image files. */
import fs from 'node:fs/promises';
import sharp from 'sharp';

const logos = JSON.parse(await fs.readFile('database/data/school-logos.json', 'utf8'));
const websites = JSON.parse(await fs.readFile('database/data/school-websites.json', 'utf8'));
const selected = process.argv.slice(2);
const entries = Object.entries(logos).filter(([code]) => !selected.length || selected.includes(code));
const headers = { 'User-Agent': 'Trovio school logo quality check' };
async function inspect(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!response.ok || !response.url.startsWith('https://')) throw new Error('Image unavailable');
  const bytes = Buffer.from(await response.arrayBuffer());
  const { width, height, format } = await sharp(bytes).metadata();
  return { url, width, height, format };
}
function candidates(html, base) {
  const found = new Map();
  for (const match of html.matchAll(/<(?:img|link|meta)\b[^>]*>/gi)) {
    const a = Object.fromEntries([...match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(m => [m[1].toLowerCase(), (m[2] ?? m[3]).replaceAll('&amp;', '&')]));
    const raw = a['data-src'] || a.src || (/icon/i.test(a.rel || '') ? a.href : /og:image/.test(a.property || '') ? a.content : '');
    if (!raw) continue;
    try {
      const parsed = new URL(raw, base);
      if (parsed.protocol === 'http:') parsed.protocol = 'https:';
      if (parsed.protocol !== 'https:') continue;
      const context = [parsed.pathname, a.alt, a.class, a.id].join(' ').toLowerCase();
      if (!/logo|icon/.test(context) || /partner|facebook|zalo|youtube|messenger|moet|bo-giao|accredit|cea-saigon|kiem.?dinh/.test(context)) continue;
      const score = (/logo/.test(context) ? 100 : 0) + (/header|brand/.test(context) ? 30 : 0) - (/favicon|footer|white/.test(context) ? 20 : 0);
      const variants = [parsed.href];
      if (parsed.pathname.includes('/_next/image') && parsed.searchParams.has('url')) variants.unshift(new URL(parsed.searchParams.get('url'), parsed.origin).href);
      if (/-\d+x\d+\.(png|jpg|webp)$/i.test(parsed.pathname)) variants.unshift(parsed.href.replace(/-\d+x\d+(?=\.(png|jpg|webp))/i, ''));
      if (parsed.pathname.includes('/thumbs/')) variants.unshift(parsed.origin + parsed.pathname.replace(/^\/thumbs\/[^/]+/, ''));
      if (parsed.pathname.endsWith('.svg')) { parsed.search = ''; variants.unshift(parsed.href); }
      for (const url of variants) found.set(url, Math.max(score, found.get(url) ?? 0));
    } catch { /* Ignore malformed website markup. */ }
  }
  return [...found].sort((a, b) => b[1] - a[1]).slice(0, 10);
}
let next = 0;
async function worker() {
  while (next < entries.length) {
    const [code, url] = entries[next++];
    const result = { code };
    try {
      result.current = await inspect(url);
      if (result.current.format !== 'svg' && Math.min(result.current.width, result.current.height) < 192) {
        const response = await fetch(websites[code], { headers, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('Homepage unavailable');
        const options = candidates(await response.text(), response.url);
        const checked = await Promise.allSettled(options.map(async ([src, score]) => ({ ...await inspect(src), score })));
        result.candidates = checked.filter(r => r.status === 'fulfilled').map(r => r.value)
          .filter(r => r.format === 'svg' || Math.min(r.width, r.height) >= 192)
          .sort((a, b) => b.score - a.score || Math.min(b.width, b.height) - Math.min(a.width, a.height)).slice(0, 3);
      }
    } catch (error) { result.error = error.message; }
    console.log(JSON.stringify(result));
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
