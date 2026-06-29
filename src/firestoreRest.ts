import { ensureAnonymousSession, firestoreBaseUrl } from "./firebase";

export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export async function getFirebaseDocument<T>(relativePath: string): Promise<T | null> {
  const session = await ensureAnonymousSession();
  const response = await fetch(`${firestoreBaseUrl()}/${relativePath}`, {
    headers: { Authorization: `Bearer ${session.idToken}` },
  });
  if (response.status === 404) return null;
  const payload = (await response.json()) as {
    fields?: Record<string, FirestoreValue>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(payload.error?.message || "Firestore read failed.");
  return fromFirestoreFields(payload.fields || {}) as T;
}

export async function putFirebaseDocument(relativePath: string, value: unknown): Promise<void> {
  const session = await ensureAnonymousSession();
  const response = await fetch(`${firestoreBaseUrl()}/${relativePath}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(value as Record<string, unknown>) }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "Firestore write failed.");
}

export async function createFirebaseDocument(
  relativeCollectionPath: string,
  documentId: string,
  value: unknown,
): Promise<boolean> {
  const session = await ensureAnonymousSession();

  const params = new URLSearchParams({
    documentId,
  });

  const response = await fetch(
    `${firestoreBaseUrl()}/${relativeCollectionPath}?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: toFirestoreFields(
          value as Record<string, unknown>,
        ),
      }),
    },
  );

  const payload = (await response
    .json()
    .catch(() => ({}))) as {
    error?: { message?: string; status?: string };
  };

  if (response.status === 409) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        "Firestore document creation failed.",
    );
  }

  return true;
}

export async function deleteFirebaseDocument(relativePath: string): Promise<void> {
  const session = await ensureAnonymousSession();
  const response = await fetch(`${firestoreBaseUrl()}/${relativePath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.idToken}` },
  });
  if (!response.ok && response.status !== 404) {
    const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(payload.error?.message || "Firestore delete failed.");
  }
}

export async function listFirebaseCollection<T>(
  relativePath: string,
  options?: { pageSize?: number; orderBy?: string },
): Promise<T[]> {
  const session = await ensureAnonymousSession();
  const params = new URLSearchParams();
  params.set("pageSize", String(options?.pageSize ?? 100));
  if (options?.orderBy) params.set("orderBy", options.orderBy);

  const response = await fetch(`${firestoreBaseUrl()}/${relativePath}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${session.idToken}` },
  });
  const payload = (await response.json()) as {
    documents?: Array<{ fields?: Record<string, FirestoreValue> }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(payload.error?.message || "Firestore list failed.");
  return (payload.documents || []).map((document) => fromFirestoreFields(document.fields || {}) as T);
}

function toFirestoreFields(value: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, toFirestoreValue(item)]),
  );
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
}

function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function fromFirestoreValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  return fromFirestoreFields(value.mapValue.fields || {});
}
