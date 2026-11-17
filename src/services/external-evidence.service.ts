import "server-only";
import type { ChatSource } from "../domain/chat";
import { normalizeVi } from "../lib/text";

export interface ExternalEvidence {
  text: string;
  sources: ChatSource[];
}

const STOP = new Set(["cho", "cua", "voi", "nhung", "mot", "the", "nao", "toi", "ban", "hoc", "nganh", "truong", "dai", "ve", "la", "co", "khong", "duoc", "gi", "tai"]);

function tokens(value: string): string[] {
  return normalizeVi(value).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !STOP.has(word));
}

function relevanceScore(question: string, title: string): number {
  const terms = new Set(tokens(question));
  return tokens(title).filter((word) => terms.has(word)).length;
}

async function jsonFrom(url: string, fetchImpl: typeof fetch, headers?: HeadersInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetchImpl(url, { headers, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Search snippets are evidence only when the title matches the question. */
async function searchBrave(question: string, fetchImpl: typeof fetch): Promise<ExternalEvidence | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!key) return null;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(question)}&count=5`;
  const data = await jsonFrom(url, fetchImpl, { "X-Subscription-Token": key, Accept: "application/json" }) as {
    web?: { results?: Array<{ title?: string; description?: string; url?: string }> };
  } | null;
  const results = (data?.web?.results ?? []).filter((item) => {
    try {
      return !!item.title && !!item.description && !!item.url && relevanceScore(question, item.title) > 0 && new URL(item.url).protocol === "https:";
    } catch {
      return false;
    }
  }).slice(0, 3);
  if (!results.length) return null;
  return {
    text: results.map((item, index) => `[${index + 1}] ${item.title}: ${item.description}`).join("\n"),
    sources: results.map((item) => ({ label: item.title!, href: item.url!, external: true })),
  };
}

/** Public encyclopedia fallback; never present its article as an admissions regulation. */
async function searchWikipedia(question: string, fetchImpl: typeof fetch): Promise<ExternalEvidence | null> {
  if (/\b(diem chuan|hoc phi|chi tieu|tuyen sinh|quy che|nguyen vong|xet tuyen|ielts)\b/.test(normalizeVi(question).toLowerCase())) return null;
  const endpoint = "https://vi.wikipedia.org/w/api.php?format=json&action=query";
  const search = await jsonFrom(`${endpoint}&list=search&srlimit=4&srsearch=${encodeURIComponent(question.slice(0, 160))}`, fetchImpl) as {
    query?: { search?: Array<{ pageid: number; title: string }> };
  } | null;
  const matches = (search?.query?.search ?? [])
    .filter((item) => relevanceScore(question, item.title) > 0)
    .sort((a, b) => relevanceScore(question, b.title) - relevanceScore(question, a.title))
    .slice(0, 2);
  if (!matches.length) return null;
  const ids = matches.map((item) => item.pageid).join("|");
  const details = await jsonFrom(`${endpoint}&prop=extracts&explaintext=1&exchars=1000&pageids=${ids}`, fetchImpl) as {
    query?: { pages?: Record<string, { title?: string; extract?: string }> };
  } | null;
  const pages = matches.map((item) => details?.query?.pages?.[item.pageid]).filter((page) => page?.extract && page.extract.length >= 80);
  if (!pages.length) return null;
  return {
    text: pages.map((page, index) => `[${index + 1}] ${page!.title}: ${page!.extract!.slice(0, 1000)}`).join("\n"),
    sources: pages.map((page) => ({ label: page!.title!, href: `https://vi.wikipedia.org/wiki/${encodeURIComponent(page!.title!.replace(/ /g, "_"))}`, external: true })),
  };
}

export async function findExternalEvidence(question: string, fetchImpl: typeof fetch = fetch): Promise<ExternalEvidence | null> {
  try {
    const brave = await searchBrave(question, fetchImpl);
    if (brave) return brave;
  } catch (error) {
    console.warn("[chat] External search unavailable:", error);
  }
  try {
    return await searchWikipedia(question, fetchImpl);
  } catch (error) {
    console.warn("[chat] Wikipedia unavailable:", error);
    return null;
  }
}
