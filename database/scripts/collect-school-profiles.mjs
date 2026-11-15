import fs from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import { textContent, findAll } from 'domutils';

const websites = JSON.parse(await fs.readFile('database/data/school-websites.json', 'utf8'));
await fs.mkdir('scratch/school-pages', { recursive: true });
const selected = process.argv.slice(2);
const entries = Object.entries(websites).filter(([code]) => !selected.length || selected.includes(code));
const results = JSON.parse(await fs.readFile('scratch/school-profile-candidates.json', 'utf8').catch(() => '[]'));
const clean = value => value.replace(/\s+/g, ' ').trim();
const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const absolute = (value, base) => { try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; } };
async function readPage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Trovio catalog metadata collection (+school official public information)' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  if (html.length > 5_000_000) throw new Error('HTML too large');
  const doc = parseDocument(html);
  const nodes = findAll(node => node.type === 'tag', doc.children);
  return { url: response.url, html, nodes };
}
function inspect(page) {
  const { nodes, url } = page;
  const title = clean(textContent(nodes.find(node => node.name === 'title') || {}));
  const metas = nodes.filter(node => node.name === 'meta');
  const descriptions = metas.filter(node => /^(description|og:description)$/i.test(node.attribs.name || node.attribs.property || '')).map(node => clean(node.attribs.content || '')).filter(Boolean);
  const images = nodes.filter(node => node.name === 'img').map((node, position) => {
    const a = node.attribs;
    const src = absolute(a['data-original'] || a['data-src'] || a.src || '', url);
    const context = norm(`${a.alt || ''} ${a.title || ''} ${a.class || ''} ${a.id || ''} ${src}`);
    const score = (/logo/.test(context) ? 100 : 0) + (/header|brand/.test(context) ? 20 : 0) + (position < 12 ? 10 : 0) - (/facebook|zalo|youtube|partner|doi-tac|doi_tac|bo-giao-duc/.test(context) ? 150 : 0);
    return { src, alt: a.alt || '', score };
  }).filter(image => image.src && image.score >= 100).sort((a,b) => b.score - a.score);
  const links = nodes.filter(node => node.name === 'a').map(node => ({ href: absolute(node.attribs.href || '', url), label: clean(textContent(node)) }))
    .filter(link => link.href && new URL(link.href).hostname.replace(/^www\./,'') === new URL(url).hostname.replace(/^www\./,'') && /gioi thieu|tong quan|lich su|about|overview/i.test(norm(link.label + ' ' + link.href)))
    .map(link => ({ ...link, score: /tong quan|gioi thieu chung|gioi thieu truong|overview|about us/.test(norm(link.label)) ? 20 : /gioi thieu/.test(norm(link.label)) ? 10 : 0 }))
    .sort((a,b) => b.score - a.score);
  const paragraphs = nodes.filter(node => ['p','h1','h2','h3'].includes(node.name)).map(node => clean(textContent(node)))
    .filter(text => text.length >= 100 && text.length <= 2400);
  return { url, title, descriptions, images: [...new Map(images.map(image=>[image.src,image])).values()].slice(0,8), aboutLinks: [...new Map(links.map(link=>[link.href,link])).values()].slice(0,8), paragraphs: paragraphs.slice(0,25) };
}
let next = 0;
async function worker() {
  while (next < entries.length) {
    const [code, website] = entries[next++];
    const result = { code, website };
    try {
      const home = await readPage(website);
      await fs.writeFile(`scratch/school-pages/${code}-home.html`, home.html);
      result.home = inspect(home);
      const about = result.home.aboutLinks.find(link => link.href !== home.url && !/\.pdf|javascript:|#$/.test(link.href));
      if (about) {
        try {
          const page = await readPage(about.href);
          await fs.writeFile(`scratch/school-pages/${code}-about.html`, page.html);
          result.about = inspect(page);
        } catch (error) { result.aboutError = error.message; }
      }
    } catch (error) { result.error = error.message; }
    const oldIndex = results.findIndex(item => item.code === code);
    if (oldIndex >= 0) results[oldIndex] = result;
    else results.push(result);
    console.log(`${code}: ${result.error || `${result.home.title.slice(0,75)} | logos=${result.home.images.length} | about=${result.about?.paragraphs.length || 0}`}`);
    await fs.writeFile('scratch/school-profile-candidates.json', JSON.stringify(results, null, 2));
  }
}
await Promise.all(Array.from({length:6}, worker));
await fs.writeFile('scratch/school-profile-candidates.json', JSON.stringify(results.sort((a,b)=>a.code.localeCompare(b.code)), null, 2));
