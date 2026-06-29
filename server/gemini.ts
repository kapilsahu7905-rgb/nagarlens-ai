import { GoogleGenAI } from "@google/genai";
import {
  followupJsonSchema,
  followupSchema,
  type Followup,
  issueAnalysisJsonSchema,
  issueAnalysisSchema,
  type IssueAnalysis,
  resolutionAnalysisJsonSchema,
  resolutionAnalysisSchema,
  type ResolutionAnalysis,
} from "./schemas.js";
import { parseImageDataUrl } from "./utils.js";

const primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured. Add it in Google AI Studio Settings → Secrets.");
  return new GoogleGenAI({ apiKey });
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTemporaryGeminiError(error: unknown): boolean {
  const message = getErrorText(error).toLowerCase();
  return (
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("temporarily overloaded") ||
    message.includes("temporarily busy") ||
    message.includes("429") ||
    message.includes("resource_exhausted")
  );
}

async function runWithGeminiRetry<T>(operation: () => Promise<T>): Promise<T> {
  const retryDelays = [0, 1500, 3500];
  let lastError: unknown;
  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if (retryDelays[attempt] > 0) await sleep(retryDelays[attempt]);
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const hasMoreAttempts = attempt < retryDelays.length - 1;
      if (!isTemporaryGeminiError(error) || !hasMoreAttempts) break;
      console.warn(`Gemini request temporarily failed. Retrying attempt ${attempt + 2} of ${retryDelays.length}.`);
    }
  }
  if (isTemporaryGeminiError(lastError)) {
    throw new Error("Gemini is temporarily busy. Please wait about 30 seconds and try again.");
  }
  throw lastError;
}

async function runWithModelFallback<T>(operation: (modelName: string) => Promise<T>): Promise<{ result: T; modelUsed: string }> {
  try {
    const result = await runWithGeminiRetry(() => operation(primaryModel));
    return { result, modelUsed: primaryModel };
  } catch (primaryError) {
    if (!isTemporaryGeminiError(primaryError)) throw primaryError;
    console.warn(`Primary model ${primaryModel} is unavailable. Trying ${fallbackModel}.`);
    try {
      const result = await runWithGeminiRetry(() => operation(fallbackModel));
      return { result, modelUsed: fallbackModel };
    } catch (fallbackError) {
      if (isTemporaryGeminiError(fallbackError)) {
        throw new Error("Gemini is temporarily busy on both available models. Please wait about 30 seconds and try again.");
      }
      throw fallbackError;
    }
  }
}

function languageInstruction(language: "en" | "hi"): string {
  return language === "hi"
    ? "Write all human-readable text in clear Hindi. Keep enum values exactly as defined in the schema."
    : "Write all human-readable text in clear English.";
}

export async function analyzeCivicIssue(input: {
  imageDataUrl: string;
  description: string;
  language: "en" | "hi";
  location?: { latitude?: number; longitude?: number; address?: string };
}): Promise<IssueAnalysis> {
  const image = parseImageDataUrl(input.imageDataUrl);
  const ai = getClient();
  const locationText = input.location
    ? `User-provided location: ${input.location.address || "not supplied"}; coordinates: ${input.location.latitude ?? "unknown"}, ${input.location.longitude ?? "unknown"}.`
    : "No location was supplied.";
  const prompt = `You are the civic issue intake and routing agent for NagarLens AI.
Analyze the image and the citizen's description as evidence of a hyperlocal public issue.

Citizen description: ${input.description}
${locationText}

Tasks:
1. Validate whether this is a genuine civic/public infrastructure issue that can be responsibly reported.
2. Categorize it using only the allowed category enum.
3. Estimate severity and urgency conservatively from visible evidence. Never invent measurements.
4. Identify visible safety risks without diagnosing hidden causes.
5. Suggest the most likely municipal department, but do not claim jurisdiction is confirmed.
6. Create a short action plan and a complaint letter the citizen can copy.
7. Do not claim that any complaint has already been sent or accepted.
8. If the image is unclear or irrelevant, set isValidIssue=false and explain what evidence is needed.
9. Do not identify people, infer sensitive personal traits, or include personal data.

${languageInstruction(input.language)}`;

  const { result: response } = await runWithModelFallback((modelName) =>
    ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: image.mimeType, data: image.base64 } }, { text: prompt }] }],
      config: { responseMimeType: "application/json", responseJsonSchema: issueAnalysisJsonSchema },
    }),
  );
  if (!response.text) throw new Error("Gemini returned an empty analysis.");
  return issueAnalysisSchema.parse(JSON.parse(response.text));
}

export async function compareResolutionImages(input: {
  beforeImageDataUrl: string;
  afterImageDataUrl: string;
  originalTitle: string;
  originalSummary: string;
  language: "en" | "hi";
}): Promise<ResolutionAnalysis> {
  const before = parseImageDataUrl(input.beforeImageDataUrl);
  const after = parseImageDataUrl(input.afterImageDataUrl);
  const ai = getClient();
  const prompt = `You are the resolution verification agent for NagarLens AI.
The first image is the original reported condition. The second image is the claimed after-resolution condition.

Original title: ${input.originalTitle}
Original summary: ${input.originalSummary}

Compare only visible evidence. Decide whether the issue is Resolved, Partially Resolved, Not Resolved, or Unclear.
Be conservative: if angle, lighting, location match, or evidence is insufficient, return Unclear and request better evidence.
Do not identify people or infer hidden work quality.
${languageInstruction(input.language)}`;

  const { result: response } = await runWithModelFallback((modelName) =>
    ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: before.mimeType, data: before.base64 } },
        { inlineData: { mimeType: after.mimeType, data: after.base64 } },
        { text: prompt },
      ] }],
      config: { responseMimeType: "application/json", responseJsonSchema: resolutionAnalysisJsonSchema },
    }),
  );
  if (!response.text) throw new Error("Gemini returned an empty resolution result.");
  return resolutionAnalysisSchema.parse(JSON.parse(response.text));
}

export async function generateIssueFollowup(input: {
  title: string;
  summary: string;
  category: string;
  severity: string;
  department: string;
  daysOpen: number;
  confirmations: number;
  language: "en" | "hi";
}): Promise<Followup> {
  const ai = getClient();
  const prompt = `You are the follow-up planning agent for NagarLens AI.
Prepare a factual, respectful follow-up for a civic issue that has not yet been resolved.

Title: ${input.title}
Summary: ${input.summary}
Category: ${input.category}
Severity: ${input.severity}
Suggested department: ${input.department}
Days open: ${input.daysOpen}
Community confirmations: ${input.confirmations}

Choose an escalation level based on evidence, not emotion. Do not claim the message was sent, do not invent complaint numbers, and do not threaten anyone. Include a reasonable next check interval.
${languageInstruction(input.language)}`;

  const { result: response } = await runWithModelFallback((modelName) =>
    ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: followupJsonSchema },
    }),
  );
  if (!response.text) throw new Error("Gemini returned an empty follow-up.");
  return followupSchema.parse(JSON.parse(response.text));
}

export function demoIssueAnalysis(description: string, language: "en" | "hi"): IssueAnalysis {
  const lower = description.toLowerCase();
  const category = lower.includes("water") || lower.includes("leak") || lower.includes("पानी")
    ? "Water Leakage"
    : lower.includes("garbage") || lower.includes("waste") || lower.includes("कचरा")
      ? "Waste Management"
      : lower.includes("light") || lower.includes("लाइट")
        ? "Damaged Streetlight"
        : lower.includes("drain") || lower.includes("नाली")
          ? "Open Drain"
          : "Pothole";
  const hi = language === "hi";
  return {
    isValidIssue: true,
    validationMessage: hi ? "डेमो मोड: रिपोर्ट को उदाहरण के रूप में मान्य किया गया है।" : "Demo mode: the report was accepted as an example.",
    category,
    title: hi ? "सार्वजनिक स्थान पर स्थानीय समस्या" : "Local issue affecting a public area",
    summary: hi ? "नागरिक विवरण के आधार पर यह समस्या सार्वजनिक सुरक्षा और दैनिक आवागमन को प्रभावित कर सकती है।" : "Based on the citizen description, this issue may affect public safety and everyday movement.",
    severity: "High",
    urgency: "Within 48 hours",
    safetyRisks: hi ? ["दुर्घटना का जोखिम", "आवागमन में बाधा"] : ["Accident risk", "Obstruction to movement"],
    suggestedDepartment: hi ? "संबंधित नगर निकाय विभाग (पुष्टि आवश्यक)" : "Relevant municipal department (confirmation required)",
    recommendedActions: hi ? ["स्थान की पुष्टि करें", "रिपोर्ट संबंधित विभाग को भेजें", "48 घंटे में स्थिति दोबारा जांचें"] : ["Confirm the exact location", "Forward the report to the relevant department", "Recheck the status within 48 hours"],
    complaintLetter: hi ? "विषय: स्थानीय सार्वजनिक समस्या के निरीक्षण का अनुरोध\n\nकृपया संलग्न विवरण और फोटो में दिखाई गई समस्या का निरीक्षण करें।" : "Subject: Request for inspection of a local public issue\n\nPlease inspect the issue shown in the attached description and photograph.",
    confidence: 0.72,
  };
}

export function demoResolution(language: "en" | "hi"): ResolutionAnalysis {
  return {
    resolutionStatus: "Partially Resolved",
    explanation: language === "hi" ? "डेमो मोड में बाद की फोटो को आंशिक सुधार के रूप में दिखाया गया है।" : "Demo mode marks the after-photo as a partial improvement.",
    remainingRisks: language === "hi" ? ["दोबारा निरीक्षण आवश्यक"] : ["A reinspection is required"],
    recommendedAction: language === "hi" ? "बेहतर कोण से नई फोटो लेकर दोबारा सत्यापन करें।" : "Capture a clearer image from a matching angle and verify again.",
    confidence: 0.55,
  };
}

export function demoFollowup(language: "en" | "hi"): Followup {
  return {
    subject: language === "hi" ? "लंबित स्थानीय समस्या पर स्थिति अपडेट का अनुरोध" : "Request for status update on pending local issue",
    message: language === "hi" ? "कृपया पहले रिपोर्ट की गई स्थानीय समस्या की वर्तमान स्थिति साझा करें।" : "Please provide a status update on the previously reported local issue.",
    escalationLevel: "Reminder",
    nextCheckDays: 3,
  };
}
