import assert from "node:assert/strict";
import { test } from "node:test";
import { repositories } from "../repositories";
import { DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD } from "../../src/domain/demo-account";
import { isLocalDemoLoginEnabled } from "../../src/lib/env";
import { authService } from "../../src/services/auth.service";
import type { User } from "../../src/domain/types";

test("public deployments cannot log into the shared demo account", async (t) => {
  const previous = { appUrl: process.env.APP_URL, demo: process.env.TROVIO_DEMO, nodeEnv: process.env.NODE_ENV };
  process.env.APP_URL = "https://trovio.vn";
  process.env.TROVIO_DEMO = "true";
  process.env.NODE_ENV = "production";
  try {
    assert.equal(isLocalDemoLoginEnabled(), false);
    const lookup = t.mock.method(repositories.users, "findByEmail", async () => { throw new Error("demo account should be blocked first"); });
    const result = await authService.login(DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD);
    assert.equal(result.ok, false);
    assert.equal(lookup.mock.callCount(), 0);
    assert.deepEqual(await authService.loginWithGoogle({
      sub: "demo", email: DEMO_STUDENT_EMAIL, emailVerified: true, name: "Demo", picture: null,
    }), { ok: false, reason: "disabled" });
    t.mock.method(repositories.users, "findById", async () => ({
      id: "demo-id", email: DEMO_STUDENT_EMAIL, locked: false, disabled: false,
      failedAttempts: 0, sessionVersion: 0,
    } as User));
    assert.equal(await authService.getUserForSession("demo-id", 0), null);
  } finally {
    for (const [name, value] of Object.entries({ APP_URL: previous.appUrl, TROVIO_DEMO: previous.demo, NODE_ENV: previous.nodeEnv })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("demo account is enabled only for a local app URL", () => {
  const previous = { appUrl: process.env.APP_URL, demo: process.env.TROVIO_DEMO, nodeEnv: process.env.NODE_ENV };
  try {
    process.env.APP_URL = "http://localhost:3000";
    process.env.NODE_ENV = "development";
    assert.equal(isLocalDemoLoginEnabled(), true);
    process.env.NODE_ENV = "production";
    delete process.env.TROVIO_DEMO;
    assert.equal(isLocalDemoLoginEnabled(), false);
    process.env.TROVIO_DEMO = "true";
    assert.equal(isLocalDemoLoginEnabled(), true);
  } finally {
    for (const [name, value] of Object.entries({ APP_URL: previous.appUrl, TROVIO_DEMO: previous.demo, NODE_ENV: previous.nodeEnv })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
