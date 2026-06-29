const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.storageBucket,
);

export interface AuthSession {
  idToken: string;
  refreshToken: string;
  localId: string;
  expiresAt: number;
  provider?: "guest" | "email" | "google";
}

type AnonymousSession = AuthSession;

const SESSION_KEY = "nagarlens_firebase_session_v1";
let sessionPromise: Promise<AnonymousSession> | null = null;

function readSession(): AnonymousSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AnonymousSession;
  } catch {
    return null;
  }
}

function storeSession(session: AnonymousSession): AnonymousSession {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function createAnonymousSession(): Promise<AnonymousSession> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseConfig.apiKey!)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const payload = await response.json() as {
    idToken?: string;
    refreshToken?: string;
    localId?: string;
    expiresIn?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.idToken || !payload.refreshToken || !payload.localId) {
    throw new Error(payload.error?.message || "Anonymous Firebase sign-in failed.");
  }
  return storeSession({
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    localId: payload.localId,
    expiresAt: Date.now() + Math.max(300, Number(payload.expiresIn || 3600) - 60) * 1000,
    provider: "guest",
  });
}

async function refreshSession(current: AnonymousSession): Promise<AnonymousSession> {
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(firebaseConfig.apiKey!)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: current.refreshToken,
      }),
    },
  );
  const payload = await response.json() as {
    id_token?: string;
    refresh_token?: string;
    user_id?: string;
    expires_in?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.id_token || !payload.refresh_token || !payload.user_id) {
    localStorage.removeItem(SESSION_KEY);
    throw new Error(payload.error?.message || "Firebase session refresh failed.");
  }
  return storeSession({
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
    localId: payload.user_id,
    expiresAt: Date.now() + Math.max(300, Number(payload.expires_in || 3600) - 60) * 1000,
    provider: current.provider || "guest",
  });
}

export function ensureAnonymousSession(): Promise<AnonymousSession> {
  if (!firebaseConfigured) throw new Error("Firebase is not configured.");
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const current = readSession();
    if (!current) return createAnonymousSession();
    if (current.expiresAt > Date.now()) return current;
    try {
      return await refreshSession(current);
    } catch {
      return createAnonymousSession();
    }
  })().finally(() => {
    sessionPromise = null;
  });
  return sessionPromise;
}


export function readCurrentFirebaseSession(): AuthSession | null {
  return readSession();
}

export function clearFirebaseSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

function emailAuthEndpoint(mode: "signin" | "signup"): string {
  const action = mode === "signin" ? "signInWithPassword" : "signUp";
  return `https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(firebaseConfig.apiKey!)}`;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
  mode: "signin" | "signup" = "signin",
): Promise<AuthSession> {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const response = await fetch(emailAuthEndpoint(mode), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const payload = (await response.json()) as {
    idToken?: string;
    refreshToken?: string;
    localId?: string;
    expiresIn?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.idToken || !payload.refreshToken || !payload.localId) {
    const message = payload.error?.message || "Email authentication failed.";
    if (message.includes("EMAIL_NOT_FOUND") || message.includes("INVALID_LOGIN_CREDENTIALS")) {
      throw new Error("No account found for this email. Create an account first or continue as guest.");
    }
    if (message.includes("EMAIL_EXISTS")) {
      throw new Error("This email already has an account. Try signing in instead.");
    }
    if (message.includes("PASSWORD")) {
      throw new Error("Password must be at least 6 characters and match the account.");
    }
    if (message.includes("OPERATION_NOT_ALLOWED")) {
      throw new Error("Email sign-in is not enabled in Firebase Authentication yet.");
    }
    throw new Error(message);
  }

  return storeSession({
    idToken: payload.idToken,
    refreshToken: payload.refreshToken,
    localId: payload.localId,
    expiresAt: Date.now() + Math.max(300, Number(payload.expiresIn || 3600) - 60) * 1000,
    provider: "email",
  });
}

export function firestoreBaseUrl(): string {
  if (!firebaseConfig.projectId) throw new Error("Firebase project ID is missing.");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents`;
}

export function storageUploadUrl(path: string): string {
  if (!firebaseConfig.storageBucket) throw new Error("Firebase storage bucket is missing.");
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(firebaseConfig.storageBucket)}/o?name=${encodeURIComponent(path)}`;
}

export function storageDownloadUrl(path: string): string {
  if (!firebaseConfig.storageBucket) throw new Error("Firebase storage bucket is missing.");
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(firebaseConfig.storageBucket)}/o/${encodeURIComponent(path)}?alt=media`;
}
