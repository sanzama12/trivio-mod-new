import assert from "node:assert/strict";
import test from "node:test";
import { formatVndInput, parseVndInput } from "../../src/lib/vnd-amount";

test("VND input groups thousands with dots and submits an integer amount", () => {
  assert.equal(formatVndInput("150000"), "150.000");
  assert.equal(formatVndInput("1.234.567"), "1.234.567");
  assert.equal(formatVndInput("00050000"), "50.000");
  assert.equal(parseVndInput("150.000"), 150000);
  assert.equal(formatVndInput("123.000."), "123.000");
  assert.equal(parseVndInput("123.000."), 123000);
  assert.equal(parseVndInput("123.000.."), 123000);
  assert.equal(parseVndInput("100.000.000"), 100000000);
  assert.equal(parseVndInput(""), Number.NaN);
  assert.equal(parseVndInput("1.23"), Number.NaN);
  assert.equal(formatVndInput("10.000,50"), "10.000,50");
  assert.equal(parseVndInput("10.000,50"), Number.NaN);
});
