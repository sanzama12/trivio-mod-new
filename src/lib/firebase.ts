import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type Auth,
  type UserCredential,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

function initFirebase() {
  if (typeof window === "undefined") {
    return { app: undefined, auth: undefined, googleProvider: undefined };
  }

  if (!isFirebaseConfigured()) {
    return { app: undefined, auth: undefined, googleProvider: undefined };
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (!auth) {
    auth = getAuth(app);
    auth.languageCode = "vi";
  }

  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  }

  return { app, auth, googleProvider };
}

export function getFirebaseAuth(): Auth | undefined {
  return initFirebase().auth;
}

export interface FirebaseLoginSuccess {
  idToken: string;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
  };
}

/**
 * Đăng nhập bằng Google qua Firebase Popup trên trình duyệt
 */
export async function signInWithGoogleFirebase(): Promise<FirebaseLoginSuccess> {
  const { auth: clientAuth, googleProvider: provider } = initFirebase();

  if (!clientAuth || !provider) {
    throw new Error(
      "Firebase chưa được cấu hình. Vui lòng thêm NEXT_PUBLIC_FIREBASE_* vào .env.local"
    );
  }

  const credential: UserCredential = await signInWithPopup(clientAuth, provider);
  const user = credential.user;
  const idToken = await user.getIdToken();

  return {
    idToken,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    },
  };
}

/**
 * Gửi email đặt lại mật khẩu từ Firebase Auth
 * Người dùng sẽ nhận được email trực tiếp từ Google Firebase với liên kết đặt lại mật khẩu
 */
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  const { auth: clientAuth } = initFirebase();

  if (!clientAuth) {
    throw new Error(
      "Firebase chưa được cấu hình. Vui lòng thêm NEXT_PUBLIC_FIREBASE_* vào .env.local"
    );
  }

  await sendPasswordResetEmail(clientAuth, email.trim().toLowerCase());
}
