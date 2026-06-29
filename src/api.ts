import type { ApiMeta, Followup, IssueAnalysis, IssueCategory, Language, ResolutionAnalysis, Severity } from "./types";

async function postJson<T>(url: string, body: unknown, timeoutMs = 45_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json()) as { error?: string } & T;
    if (!response.ok) throw new Error(payload.error || `Request failed with status ${response.status}.`);
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The AI request timed out. Try a smaller image or retry in a moment.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function analyzeIssue(payload: {
  imageDataUrl: string;
  description: string;
  language: Language;
  location: { latitude?: number; longitude?: number; address?: string };
}): Promise<{ analysis: IssueAnalysis; meta: ApiMeta }> {
  return postJson("/api/analyze-issue", payload);
}

export function verifyResolution(payload: {
  beforeImageDataUrl: string;
  afterImageDataUrl: string;
  originalTitle: string;
  originalSummary: string;
  language: Language;
}): Promise<{ analysis: ResolutionAnalysis; meta: ApiMeta }> {
  return postJson("/api/verify-resolution", payload, 60_000);
}

export function generateFollowup(payload: {
  title: string;
  summary: string;
  category: IssueCategory;
  severity: Severity;
  department: string;
  daysOpen: number;
  confirmations: number;
  language: Language;
}): Promise<{ followup: Followup; meta: ApiMeta }> {
  return postJson("/api/generate-followup", payload);
}
