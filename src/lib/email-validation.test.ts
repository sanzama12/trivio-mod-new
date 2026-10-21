import assert from "node:assert/strict";
import { test } from "node:test";
import { emailError } from "./email-validation";

test("accepts school domains, plus addressing and surrounding whitespace", () => {
  for (const email of ["student@gmail.com", " student+tag@school.edu.vn ", "a@sub.example.com"]) assert.equal(emailError(email), undefined);
});

test("rejects missing or malformed email syntax", () => {
  for (const email of ["", "student", "a@@b.com", "a b@gmail.com", "a..b@gmail.com", ".a@gmail.com", "a.@gmail.com", "a@-mail.com", "a@domain..com", "a@domain.c", "a@domain.com-", `${"a".repeat(65)}@example.com`]) assert.ok(emailError(email), email);
});
