import type { CommunityIssue, IssueCategory, Severity } from "./types";

function svgIssue(label: string, symbol: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dcefe9"/><stop offset="1" stop-color="#f8e8c9"/></linearGradient></defs>
    <rect width="900" height="560" fill="url(#g)"/>
    <rect x="70" y="70" width="760" height="420" rx="42" fill="#ffffff" opacity=".82"/>
    <text x="450" y="270" text-anchor="middle" font-size="110">${symbol}</text>
    <text x="450" y="360" text-anchor="middle" font-size="38" font-family="Arial" fill="#173b33">${label}</text>
    <text x="450" y="410" text-anchor="middle" font-size="22" font-family="Arial" fill="#4f6b64">Demo evidence image</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createIssue(
  id: string,
  title: string,
  category: IssueCategory,
  severity: Severity,
  imageSymbol: string,
  address: string,
  latitude: number,
  longitude: number,
  confirmations: number,
  status: CommunityIssue["status"],
  hoursAgo: number,
): CommunityIssue {
  const created = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
  return {
    id,
    description: `${title} reported by a community member.`,
    imageUrl: svgIssue(title, imageSymbol),
    location: { address, latitude, longitude },
    analysis: {
      isValidIssue: true,
      validationMessage: "Demo report with sufficient visible evidence.",
      category,
      title,
      summary: `The submitted evidence indicates a ${category.toLowerCase()} concern in a public area that may require municipal inspection.`,
      severity,
      urgency: severity === "Critical" ? "Immediate" : severity === "High" ? "Within 48 hours" : "Within 7 days",
      safetyRisks: ["Risk to pedestrians and road users", "Possible disruption to daily movement"],
      suggestedDepartment: category === "Water Leakage" ? "Water Works / Jal Board" : category === "Waste Management" ? "Municipal Sanitation Department" : "Municipal Roads Department",
      recommendedActions: ["Verify the exact location", "Arrange an on-site inspection", "Publish a status update"],
      complaintLetter: `Please inspect the reported ${category.toLowerCase()} issue at ${address}. The community requests appropriate action and a transparent status update.`,
      confidence: 0.88,
    },
    status,
    confirmations,
    disputes: 0,
    duplicateFlags: 0,
    potentialDuplicateIds: [],
    createdAt: created,
    updatedAt: created,
    timeline: [
      {
        id: `${id}_event_1`,
        label: "Issue reported",
        detail: "AI analysis completed and the report was added to the community board.",
        createdAt: created,
      },
    ],
    reporterId: id === "demo_pothole" ? "hero_aisha" : id === "demo_leak" ? "hero_arjun" : "hero_fatima",
    reporterName: id === "demo_pothole" ? "Aisha Verma" : id === "demo_leak" ? "Arjun Mehta" : "Fatima Khan",
    aiMeta: { model: "demo-seed", demo: true },
  };
}

export const sampleIssues: CommunityIssue[] = [
  createIssue("demo_pothole", "Deep pothole near school crossing", "Pothole", "High", "🕳️", "Gomti Nagar, Lucknow", 26.8494, 81.0083, 14, "Verified", 7),
  createIssue("demo_leak", "Continuous water leakage beside market", "Water Leakage", "Medium", "💧", "Hazratganj, Lucknow", 26.8526, 80.9462, 8, "In Progress", 30),
  createIssue("demo_waste", "Overflowing waste collection point", "Waste Management", "High", "🗑️", "Aliganj, Lucknow", 26.8971, 80.946, 21, "Reported", 3),
];
