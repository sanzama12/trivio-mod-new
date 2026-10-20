import { randomUUID } from "node:crypto";

/** Full UUID; independent of display names, slugs and admission codes. */
export function createId(entity: "school" | "major" | "program" | "user"): string {
  const prefix = { school: "sch", major: "maj", program: "prg", user: "u" }[entity];
  return `${prefix}-${randomUUID()}`;
}

export function normalizeBusinessCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isMajorCode(value: string): boolean {
  return /^\d{7}$/.test(value) && !value.startsWith("799");
}
