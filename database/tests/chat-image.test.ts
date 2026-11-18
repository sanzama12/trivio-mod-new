import assert from "node:assert/strict";
import test from "node:test";
import { isChatImageMime, matchesChatImageSignature } from "../../src/domain/chat-image";
import { answerWithWusRouter } from "../../src/services/wusrouter-llm";

test("chat accepts only supported image signatures", () => {
  assert.equal(isChatImageMime("image/png"), true);
  assert.equal(isChatImageMime("image/svg+xml"), false);
  assert.equal(matchesChatImageSignature(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(matchesChatImageSignature(Uint8Array.from([60, 115, 118, 103, 62, 0, 0, 0]), "image/png"), false);
  assert.equal(matchesChatImageSignature(Uint8Array.from([255, 216, 255]), "image/jpeg"), true);
});

test("vision request sends image only to the image-capable model", async () => {
  const previousKey = process.env.WUSROUTER_API_KEY;
  const previousModel = process.env.WUSROUTER_VISION_MODEL;
  process.env.WUSROUTER_API_KEY = "test-key";
  process.env.WUSROUTER_VISION_MODEL = "vision-test";
  let payload: any = null;
  const fetchMock = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    payload = JSON.parse(String(init?.body));
    return Response.json({ choices: [{ message: { content: "Trong ảnh có bảng điểm." } }] });
  }) as typeof fetch;
  try {
    const reply = await answerWithWusRouter({ question: "Giải thích ảnh này", image: { mime: "image/png", dataUrl: "data:image/png;base64,AAAA" } }, fetchMock);
    assert.equal(reply, "Trong ảnh có bảng điểm.");
    assert.equal(payload?.model, "vision-test");
    assert.deepEqual(payload?.messages.at(-1)?.content, [
      { type: "text", text: "Giải thích ảnh này" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
    ]);
  } finally {
    if (previousKey === undefined) delete process.env.WUSROUTER_API_KEY;
    else process.env.WUSROUTER_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.WUSROUTER_VISION_MODEL;
    else process.env.WUSROUTER_VISION_MODEL = previousModel;
  }
});
