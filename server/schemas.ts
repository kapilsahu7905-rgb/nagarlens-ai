import { z } from "zod";

export const issueCategories = [
  "Pothole",
  "Water Leakage",
  "Damaged Streetlight",
  "Waste Management",
  "Open Drain",
  "Road Damage",
  "Fallen Tree",
  "Public Infrastructure",
  "Other",
] as const;

export const severityLevels = ["Low", "Medium", "High", "Critical"] as const;

export const issueAnalysisSchema = z.object({
  isValidIssue: z.boolean(),
  validationMessage: z.string().min(1).max(300),
  category: z.enum(issueCategories),
  title: z.string().min(3).max(100),
  summary: z.string().min(3).max(600),
  severity: z.enum(severityLevels),
  urgency: z.enum(["Routine", "Within 7 days", "Within 48 hours", "Immediate"]),
  safetyRisks: z.array(z.string().min(1).max(160)).max(5),
  suggestedDepartment: z.string().min(2).max(120),
  recommendedActions: z.array(z.string().min(1).max(180)).min(1).max(5),
  complaintLetter: z.string().min(20).max(1800),
  confidence: z.number().min(0).max(1),
});

export type IssueAnalysis = z.infer<typeof issueAnalysisSchema>;

export const resolutionAnalysisSchema = z.object({
  resolutionStatus: z.enum(["Resolved", "Partially Resolved", "Not Resolved", "Unclear"]),
  explanation: z.string().min(3).max(700),
  remainingRisks: z.array(z.string().min(1).max(180)).max(5),
  recommendedAction: z.string().min(3).max(400),
  confidence: z.number().min(0).max(1),
});

export type ResolutionAnalysis = z.infer<typeof resolutionAnalysisSchema>;

export const followupSchema = z.object({
  subject: z.string().min(3).max(140),
  message: z.string().min(20).max(1800),
  escalationLevel: z.enum(["Reminder", "Urgent", "Escalation"]),
  nextCheckDays: z.number().int().min(1).max(30),
});

export type Followup = z.infer<typeof followupSchema>;

export const analyzeRequestSchema = z.object({
  imageDataUrl: z.string().min(50),
  description: z.string().trim().min(3).max(1200),
  language: z.enum(["en", "hi"]).default("en"),
  location: z
    .object({
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      address: z.string().trim().max(300).optional(),
    })
    .optional(),
});

export const resolutionRequestSchema = z.object({
  beforeImageDataUrl: z.string().min(50),
  afterImageDataUrl: z.string().min(50),
  originalTitle: z.string().min(3).max(120),
  originalSummary: z.string().min(3).max(800),
  language: z.enum(["en", "hi"]).default("en"),
});

export const followupRequestSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(3).max(800),
  category: z.enum(issueCategories),
  severity: z.enum(severityLevels),
  department: z.string().min(2).max(120),
  daysOpen: z.number().int().min(0).max(3650),
  confirmations: z.number().int().min(0).max(1_000_000),
  language: z.enum(["en", "hi"]).default("en"),
});

export const issueAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    isValidIssue: {
      type: "boolean",
      description: "Whether the image and description show a genuine hyperlocal civic or public infrastructure issue.",
    },
    validationMessage: {
      type: "string",
      description: "A concise validation explanation. If invalid, explain what evidence is missing.",
    },
    category: { type: "string", enum: issueCategories },
    title: { type: "string", description: "A factual civic issue title under 100 characters." },
    summary: { type: "string", description: "A neutral evidence-based summary of what is visible and reported." },
    severity: { type: "string", enum: severityLevels },
    urgency: { type: "string", enum: ["Routine", "Within 7 days", "Within 48 hours", "Immediate"] },
    safetyRisks: { type: "array", items: { type: "string" }, maxItems: 5 },
    suggestedDepartment: {
      type: "string",
      description: "Likely municipal department. Phrase as a suggestion, not a confirmed jurisdiction.",
    },
    recommendedActions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    complaintLetter: {
      type: "string",
      description: "A professional complaint ready to copy, without inventing identifiers or claiming submission.",
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "isValidIssue",
    "validationMessage",
    "category",
    "title",
    "summary",
    "severity",
    "urgency",
    "safetyRisks",
    "suggestedDepartment",
    "recommendedActions",
    "complaintLetter",
    "confidence",
  ],
} as const;

export const resolutionAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    resolutionStatus: { type: "string", enum: ["Resolved", "Partially Resolved", "Not Resolved", "Unclear"] },
    explanation: { type: "string" },
    remainingRisks: { type: "array", items: { type: "string" }, maxItems: 5 },
    recommendedAction: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["resolutionStatus", "explanation", "remainingRisks", "recommendedAction", "confidence"],
} as const;

export const followupJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: { type: "string" },
    message: { type: "string" },
    escalationLevel: { type: "string", enum: ["Reminder", "Urgent", "Escalation"] },
    nextCheckDays: { type: "integer", minimum: 1, maximum: 30 },
  },
  required: ["subject", "message", "escalationLevel", "nextCheckDays"],
} as const;
