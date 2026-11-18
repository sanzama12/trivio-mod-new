"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export async function signInWithGoogleFirebase(): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error("Đăng nhập Google chưa được cấu hình.");
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = "vi";
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  return credential.user.getIdToken();
}
