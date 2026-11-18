export const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_CHAT_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
export const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ChatImageMime = (typeof CHAT_IMAGE_TYPES)[number];
export type ChatImageInput = { mime: ChatImageMime; dataUrl: string };

export function isChatImageMime(value: string): value is ChatImageMime {
  return CHAT_IMAGE_TYPES.some((type) => type === value);
}

export function matchesChatImageSignature(bytes: Uint8Array, mime: ChatImageMime): boolean {
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}
