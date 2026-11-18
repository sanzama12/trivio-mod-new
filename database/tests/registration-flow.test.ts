import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../src/app/api/auth/register/route";
import { authService } from "../../src/services/auth.service";

test("successful registration creates an account without silently signing in", async (t) => {
  t.mock.method(authService, "register", async () => ({
    ok: true as const,
    user: { id: "registration-test", email: "new@example.com", onboarded: false },
  } as Awaited<ReturnType<typeof authService.register>>));

  const response = await POST(new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "new@example.com", password: "Password1", confirm: "Password1", terms: true }),
  }));

  assert.equal(response.status, 201);
  assert.equal(response.headers.has("set-cookie"), false);
  assert.equal((await response.json()).ok, true);
});
