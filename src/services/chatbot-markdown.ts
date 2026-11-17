import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ChatSource } from "../domain/chat";
import { cleanChatText, safeChatHref } from "../domain/chat";
import { normalizeVi } from "../lib/text";

type QuickAnswer = { text: string; sources: ChatSource[] };
let cachedAnswers: Map<string, QuickAnswer> | null = null;

export function faqKey(value: string): string {
  return normalizeVi(cleanChatText(value)).replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/** Parse the small, controlled FAQ Markdown format. */
export function parseMarkdownFaq(markdown: string): Map<string, QuickAnswer> {
  const answers = new Map<string, QuickAnswer>();
  for (const section of markdown.split(/^## /m).slice(1)) {
    const [title, ...body] = section.split(/\r?\n/).map((line) => line.trim());
    const aliases = body.find((line) => line.startsWith("Aliases: "))?.slice(9).split(";").map((item) => item.trim()) ?? [];
    const sourceLine = body.find((line) => line.startsWith("Source: ")) ?? "";
    const source = /^Source: \[([^\]]+)\]\((\/[^\s)]+)\)$/.exec(sourceLine);
    const text = cleanChatText(body.filter((line) => line.startsWith("> ")).map((line) => line.slice(2)).join(" "));
    if (!title || !text || !source || !safeChatHref(source[2])) throw new Error(`Invalid chatbot FAQ entry: ${title || "untitled"}`);
    const answer = { text, sources: [{ label: cleanChatText(source[1]), href: source[2] }] };
    for (const question of [title, ...aliases]) {
      const key = faqKey(question);
      if (!key || answers.has(key)) throw new Error(`Duplicate chatbot FAQ question: ${question}`);
      answers.set(key, answer);
    }
  }
  return answers;
}

export function findMarkdownAnswer(question: string): QuickAnswer | null {
  if (!cachedAnswers) {
    try {
      cachedAnswers = parseMarkdownFaq(readFileSync(join(process.cwd(), "docs", "chatbot-faq.md"), "utf8"));
    } catch (error) {
      console.error("[chat] FAQ Markdown unavailable:", error);
      cachedAnswers = new Map();
    }
  }
  return cachedAnswers.get(faqKey(question)) ?? null;
}
