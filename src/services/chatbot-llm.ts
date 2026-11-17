/** Reject unsupported numbers and links in text generated from retrieved evidence. */
export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const raw = m[0];
    out.add(raw);
    out.add(raw.replace(/\./g, "").replace(",", "."));
    out.add(raw.replace(",", "."));
  }
  return out;
}

export function isFaithful(output: string, facts: string): boolean {
  if (!output.trim() || output.length > 1200) return false;
  if (/https?:\/\/|www\./i.test(output)) return false;
  const allowed = numbersIn(facts);
  for (const m of output.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const raw = m[0];
    const variants = [raw, raw.replace(/\./g, "").replace(",", "."), raw.replace(",", ".")];
    if (!variants.some((v) => allowed.has(v))) return false;
  }
  return true;
}
