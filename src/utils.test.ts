import { describe, expect, it } from "vitest";
import { findPotentialDuplicates, haversineKm, severityRank } from "./utils";
import type { CommunityIssue } from "./types";

const baseIssue: CommunityIssue = {
  id: "1",
  description: "pothole",
  imageUrl: "data:image/svg+xml,test",
  location: { latitude: 26.8467, longitude: 80.9462, address: "Lucknow" },
  analysis: {
    isValidIssue: true,
    validationMessage: "valid",
    category: "Pothole",
    title: "Pothole",
    summary: "Road hazard",
    severity: "High",
    urgency: "Within 48 hours",
    safetyRisks: [],
    suggestedDepartment: "Roads",
    recommendedActions: ["Inspect"],
    complaintLetter: "Please inspect this reported road hazard.",
    confidence: 0.9,
  },
  status: "Reported",
  confirmations: 0,
  disputes: 0,
  duplicateFlags: 0,
  potentialDuplicateIds: [],
  createdAt: "2026-06-22T12:00:00.000Z",
  updatedAt: "2026-06-22T12:00:00.000Z",
  timeline: [],
  aiMeta: { model: "test", demo: false },
};

describe("location utilities", () => {
  it("calculates zero distance for identical coordinates", () => {
    expect(haversineKm(baseIssue.location, baseIssue.location)).toBeCloseTo(0);
  });

  it("finds nearby reports in the same category", () => {
    const result = findPotentialDuplicates([baseIssue], "Pothole", {
      latitude: 26.847,
      longitude: 80.946,
      address: "Lucknow",
    });
    expect(result).toHaveLength(1);
  });

  it("orders severity", () => {
    expect(severityRank("Critical")).toBeGreaterThan(severityRank("Low"));
  });
});
