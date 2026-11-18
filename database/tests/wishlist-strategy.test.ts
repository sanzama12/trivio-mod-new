import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeWishlist, type StrategyItem } from "../../src/services/wishlist-strategy";

const item = (id: string, name = "Cong nghe thong tin"): StrategyItem => ({
  id,
  label: name,
  program: {
    id,
    name,
    majorId: id,
    cutoffs: [],
    altCutoffs: [],
    combos: [],
    tuitionMin: 0,
    tuitionMax: 0,
  },
});

test("missing profile does not assert admission eligibility", () => {
  const report = analyzeWishlist([item("it")], null);
  assert.equal(report.status, "incomplete");
  assert.equal(report.evaluatedItems[0].eligibility.isEligible, null);
});

test("known wishlist restrictions still apply without a score profile", () => {
  const items = Array.from({ length: 5 }, (_, index) => item(`it-${index}`));
  items.push(item("su-pham", "Su pham Toan"));
  const report = analyzeWishlist(items, null);
  assert.equal(report.evaluatedItems[5].eligibility.isEligible, false);
  assert.equal(report.evaluatedItems[5].eligibility.reason, "teacher-training-rank");
});
