import assert from "node:assert/strict";
import test from "node:test";
import { ANONYMOUS_DONOR_NAME, publicDonorName } from "../../src/domain/donation";
import { donationService } from "../../src/services/donation.service";
import { repositories } from "../repositories";

test("public donor names hide identifying middle letters", () => {
  assert.equal(publicDonorName("Nguyễn Bùi Xuân Việt"), "N****n B** X*** V**t");
  assert.equal(publicDonorName("  Trần   An  "), "T**n A*");
  assert.equal(publicDonorName("Việt"), "V**t");
  assert.equal(publicDonorName(ANONYMOUS_DONOR_NAME), ANONYMOUS_DONOR_NAME);
  assert.equal(publicDonorName(""), ANONYMOUS_DONOR_NAME);
});

test("public donor feed omits full names and free-form messages", async (t) => {
  t.mock.method(repositories.donations, "getRecentSuccess", async () => [{
    id: "test-donation", donorName: "Nguyễn Bùi Xuân Việt", amount: 123000,
    message: "Liên hệ qua email@example.com", paidAt: "2026-11-18T07:00:00.000Z",
  }]);
  const [donor] = await donationService.getRecentDonors(1, true);
  assert.equal(donor.name, "N****n B** X*** V**t");
  assert.equal(donor.amount, 123000);
  assert.equal("donorName" in donor, false);
  assert.equal("message" in donor, false);
});
