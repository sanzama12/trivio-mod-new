import { normalizeVi } from "../lib/text";
import { safeChatHref } from "../domain/chat";

export function requiresPrimaryEvidence(question: string): boolean {
  return /\b(diem|uu tien|cong diem|diem cong|chung chi|ielts|toefl|quy doi|quy che|tuyen sinh|hoc phi|chi tieu|hoc bong|so sanh|xep hang|hieu truong|lanh dao|nguong|nguyen vong|phap ly|dao tao|sinh vien|bao lau)\b/.test(normalizeVi(question).toLowerCase());
}

/** A specific primary document URL is required; a domain homepage proves no figure. */
export function isPrimaryDocumentUrl(value: unknown): value is string {
  if (typeof value !== "string" || !safeChatHref(value) || !value.startsWith("https://")) return false;
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  return (host === "chinhphu.vn" || host.endsWith(".chinhphu.vn") || host.endsWith(".gov.vn") || host.endsWith(".edu.vn")) &&
    (url.pathname !== "/" || url.searchParams.has("docid"));
}
