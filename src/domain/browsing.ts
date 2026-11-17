export type ContentViewKind = "major_view" | "school_view" | "program_view";
export interface ContentView {
  kind: ContentViewKind;
  id: string;
  count: number;
  lastViewedAt: number;
}
export const VIEW_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_CONTENT_VIEWS = 60;

export function sanitizeContentViews(input: unknown, now = Date.now()): ContentView[] {
  if (!Array.isArray(input)) return [];
  const views = new Map<string, ContentView>();
  for (const item of input.slice(0, 200)) {
    if (!item || !["major_view", "school_view", "program_view"].includes(item.kind) ||
        typeof item.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(item.id) ||
        !Number.isInteger(item.count) || item.count < 1 ||
        typeof item.lastViewedAt !== "number" || !Number.isFinite(item.lastViewedAt) ||
        item.lastViewedAt > now || item.lastViewedAt < now - VIEW_RETENTION_MS) continue;
    const view: ContentView = { kind: item.kind, id: item.id, count: Math.min(50, item.count), lastViewedAt: item.lastViewedAt };
    const key = `${view.kind}:${view.id}`;
    const previous = views.get(key);
    if (!previous || previous.lastViewedAt < view.lastViewedAt) views.set(key, view);
  }
  return [...views.values()].sort((a, b) => b.lastViewedAt - a.lastViewedAt).slice(0, MAX_CONTENT_VIEWS);
}

export function recordContentView(views: ContentView[], kind: ContentViewKind, id: string, now = Date.now()): ContentView[] {
  const clean = sanitizeContentViews(views, now);
  const previous = clean.find((view) => view.kind === kind && view.id === id);
  // Prevent rapid refreshes and duplicate mounts from inflating interest.
  if (previous && now - previous.lastViewedAt < 30_000) return clean;
  return sanitizeContentViews([
    { kind, id, count: (previous?.count ?? 0) + 1, lastViewedAt: now },
    ...clean.filter((view) => view !== previous),
  ], now);
}

export function contentViewWeight(view: ContentView, now = Date.now()): number {
  const ageDays = Math.max(0, now - view.lastViewedAt) / (24 * 60 * 60 * 1000);
  return Math.log2(1 + view.count) * 2 ** (-ageDays / 14);
}
