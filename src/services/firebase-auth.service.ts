import "server-only";

interface FirebaseUser {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: Array<{ providerId: string; rawId?: string; email?: string }>;
}

export function isFirebaseServerConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim());
}

export async function verifyFirebaseGoogleToken(idToken: string, fetchImpl: typeof fetch = fetch) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey || !isFirebaseServerConfigured()) throw new Error("Firebase chưa được cấu hình.");
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(idToken) || idToken.length > 10000) {
    throw new Error("ID token không hợp lệ.");
  }
  const response = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Google không xác minh được phiên đăng nhập.");
  const data = (await response.json()) as { users?: FirebaseUser[] };
  const user = data.users?.[0];
  const google = user?.providerUserInfo?.find((provider) => provider.providerId === "google.com" && provider.rawId);
  if (!user || !google || user.emailVerified !== true || !user.email) throw new Error("Tài khoản Google chưa được xác minh.");
  if (google.email && google.email.toLowerCase() !== user.email.toLowerCase()) throw new Error("Email Google không khớp.");
  return {
    sub: google.rawId!,
    email: user.email.toLowerCase().trim(),
    emailVerified: true,
    name: user.displayName?.trim() || user.email.split("@")[0],
    picture: user.photoUrl || null,
  };
}
