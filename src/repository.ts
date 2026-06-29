import {
  ensureAnonymousSession,
  firebaseConfigured,
  storageDownloadUrl,
  storageUploadUrl,
} from "./firebase";
import {
  getFirebaseDocument,
  listFirebaseCollection,
  putFirebaseDocument,
} from "./firestoreRest";
import { sampleIssues } from "./sampleData";
import type { CommunityIssue } from "./types";

const STORAGE_KEY = "nagarlens_issues_v2";
const LOCAL_EVENT = "nagarlens:issues-updated";

export const persistenceMode = firebaseConfigured ? "firebase" : "local";

function normalizeIssue(issue: CommunityIssue): CommunityIssue {
  return {
    ...issue,
    reporterId: issue.reporterId || "community-demo",
    reporterName: issue.reporterName || "Community Member",
    potentialDuplicateIds: issue.potentialDuplicateIds || [],
    confirmations: Number(issue.confirmations || 0),
    disputes: Number(issue.disputes || 0),
    duplicateFlags: Number(issue.duplicateFlags || 0),
    timeline: issue.timeline || [],
  };
}

function readLocal(): CommunityIssue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleIssues));
      return sampleIssues.map(normalizeIssue);
    }
    return (JSON.parse(raw) as CommunityIssue[]).map(normalizeIssue);
  } catch {
    return sampleIssues.map(normalizeIssue);
  }
}

function writeLocal(issues: CommunityIssue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
}

export function subscribeIssues(callback: (issues: CommunityIssue[]) => void): () => void {
  if (!firebaseConfigured) {
    const emit = () => callback(readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    emit();
    window.addEventListener(LOCAL_EVENT, emit);
    window.addEventListener("storage", emit);
    return () => {
      window.removeEventListener(LOCAL_EVENT, emit);
      window.removeEventListener("storage", emit);
    };
  }

  let stopped = false;
  const load = async () => {
    try {
      const issues = await listFirebaseCollection<CommunityIssue>("issues", {
        pageSize: 100,
        orderBy: "createdAt desc",
      });
      if (!stopped) callback(issues.map(normalizeIssue));
    } catch (error) {
      console.error("Firebase polling failed", error);
      if (!stopped) callback(readLocal());
    }
  };
  void load();
  const timer = window.setInterval(() => void load(), 15_000);
  const refresh = () => void load();
  window.addEventListener(LOCAL_EVENT, refresh);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener(LOCAL_EVENT, refresh);
  };
}

export async function uploadIssueImage(
  dataUrl: string,
  _path: string,
): Promise<string> {
  // Firebase Storage is disabled for this MVP because new Firebase
  // Storage buckets may require Blaze billing. Firestore still stores
  // reports, profiles, XP, votes and leaderboards. The image is kept
  // as a compressed data URL preview inside the issue document.
  return dataUrl;
}

export async function saveIssue(issue: CommunityIssue): Promise<void> {
  if (!firebaseConfigured) {
    const issues = readLocal();
    writeLocal([normalizeIssue(issue), ...issues.filter((item) => item.id !== issue.id)]);
    return;
  }
  await putFirebaseDocument(`issues/${issue.id}`, normalizeIssue(issue));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
}

export async function updateIssue(issueId: string, changes: Partial<CommunityIssue>): Promise<void> {
  if (!firebaseConfigured) {
    const issues = readLocal().map((issue) =>
      issue.id === issueId ? normalizeIssue({ ...issue, ...changes }) : issue,
    );
    writeLocal(issues);
    return;
  }
  const current = await getIssue(issueId);
  if (!current) throw new Error("Issue no longer exists.");
  await putFirebaseDocument(`issues/${issueId}`, normalizeIssue({ ...current, ...changes }));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
}

export type PrimaryVerification = "confirm" | "dispute" | null;

export interface VerificationState {
  primary: PrimaryVerification;
  duplicate: boolean;
}

function readLocalVerificationState(issueId: string): VerificationState {
  const primary = localStorage.getItem(`nagarlens_verification_${issueId}_primary`);
  return {
    primary: primary === "confirm" || primary === "dispute" ? primary : null,
    duplicate: localStorage.getItem(`nagarlens_verification_${issueId}_duplicate`) === "1",
  };
}

export async function getVerificationState(issueId: string): Promise<VerificationState> {
  if (!firebaseConfigured) return readLocalVerificationState(issueId);
  const session = await ensureAnonymousSession();
  const saved = await getFirebaseDocument<Partial<VerificationState>>(
    `issues/${issueId}/verifications/${session.localId}`,
  );
  return {
    primary: saved?.primary === "confirm" || saved?.primary === "dispute" ? saved.primary : null,
    duplicate: saved?.duplicate === true,
  };
}

export async function setPrimaryVerification(
  issueId: string,
  clickedChoice: Exclude<PrimaryVerification, null>,
): Promise<VerificationState> {
  const current = await getVerificationState(issueId);
  const nextPrimary: PrimaryVerification = current.primary === clickedChoice ? null : clickedChoice;
  const issue = await getIssue(issueId);
  if (!issue) throw new Error("Issue no longer exists.");

  const confirmations = Math.max(
    0,
    issue.confirmations - (current.primary === "confirm" ? 1 : 0) + (nextPrimary === "confirm" ? 1 : 0),
  );
  const disputes = Math.max(
    0,
    issue.disputes - (current.primary === "dispute" ? 1 : 0) + (nextPrimary === "dispute" ? 1 : 0),
  );
  let status = issue.status;
  if (nextPrimary === "confirm" && status === "Reported") status = "Verified";
  if (confirmations === 0 && status === "Verified") status = "Reported";

  if (!firebaseConfigured) {
    const key = `nagarlens_verification_${issueId}_primary`;
    if (nextPrimary) localStorage.setItem(key, nextPrimary);
    else localStorage.removeItem(key);
    const issues = readLocal().map((item) =>
      item.id === issueId
        ? { ...item, confirmations, disputes, status, updatedAt: new Date().toISOString() }
        : item,
    );
    writeLocal(issues);
  } else {
    const session = await ensureAnonymousSession();
    await putFirebaseDocument(`issues/${issueId}/verifications/${session.localId}`, {
      primary: nextPrimary,
      duplicate: current.duplicate,
      updatedAt: new Date().toISOString(),
    });
    await updateIssue(issueId, {
      confirmations,
      disputes,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  return { primary: nextPrimary, duplicate: current.duplicate };
}

export async function toggleDuplicateVerification(issueId: string): Promise<VerificationState> {
  const current = await getVerificationState(issueId);
  const nextDuplicate = !current.duplicate;
  const issue = await getIssue(issueId);
  if (!issue) throw new Error("Issue no longer exists.");
  const duplicateFlags = Math.max(0, issue.duplicateFlags + (nextDuplicate ? 1 : -1));

  if (!firebaseConfigured) {
    const key = `nagarlens_verification_${issueId}_duplicate`;
    if (nextDuplicate) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
    writeLocal(
      readLocal().map((item) =>
        item.id === issueId
          ? { ...item, duplicateFlags, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  } else {
    const session = await ensureAnonymousSession();
    await putFirebaseDocument(`issues/${issueId}/verifications/${session.localId}`, {
      primary: current.primary,
      duplicate: nextDuplicate,
      updatedAt: new Date().toISOString(),
    });
    await updateIssue(issueId, { duplicateFlags, updatedAt: new Date().toISOString() });
  }

  return { primary: current.primary, duplicate: nextDuplicate };
}

export async function getIssue(issueId: string): Promise<CommunityIssue | null> {
  if (!firebaseConfigured) return readLocal().find((issue) => issue.id === issueId) ?? null;
  const issue = await getFirebaseDocument<CommunityIssue>(`issues/${issueId}`);
  return issue ? normalizeIssue(issue) : null;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const bytes = atob(encoded);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
  return new Blob([array], { type: mime });
}
