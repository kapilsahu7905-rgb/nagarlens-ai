export type Language = "en" | "hi";

export type AppView = "dashboard" | "report" | "board" | "heroes" | "profile";

export type IssueCategory =
  | "Pothole"
  | "Water Leakage"
  | "Damaged Streetlight"
  | "Waste Management"
  | "Open Drain"
  | "Road Damage"
  | "Fallen Tree"
  | "Public Infrastructure"
  | "Other";

export type Severity = "Low" | "Medium" | "High" | "Critical";
export type IssueStatus =
  | "Reported"
  | "Verified"
  | "Forwarded"
  | "In Progress"
  | "Resolved"
  | "Reinspection Required";

export interface IssueAnalysis {
  isValidIssue: boolean;
  validationMessage: string;
  category: IssueCategory;
  title: string;
  summary: string;
  severity: Severity;
  urgency: "Routine" | "Within 7 days" | "Within 48 hours" | "Immediate";
  safetyRisks: string[];
  suggestedDepartment: string;
  recommendedActions: string[];
  complaintLetter: string;
  confidence: number;
}

export interface ResolutionAnalysis {
  resolutionStatus: "Resolved" | "Partially Resolved" | "Not Resolved" | "Unclear";
  explanation: string;
  remainingRisks: string[];
  recommendedAction: string;
  confidence: number;
}

export interface Followup {
  subject: string;
  message: string;
  escalationLevel: "Reminder" | "Urgent" | "Escalation";
  nextCheckDays: number;
}

export interface TimelineEvent {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
}

export interface IssueLocation {
  latitude?: number;
  longitude?: number;
  address: string;
}

export interface CommunityIssue {
  id: string;
  description: string;
  imageUrl: string;
  resolutionImageUrl?: string;
  location: IssueLocation;
  analysis: IssueAnalysis;
  resolutionAnalysis?: ResolutionAnalysis;
  status: IssueStatus;
  confirmations: number;
  disputes: number;
  duplicateFlags: number;
  potentialDuplicateIds: string[];
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
  reporterId?: string;
  reporterName?: string;
  resolutionContributorId?: string;
  resolutionContributorName?: string;
  aiMeta: {
    model: string;
    demo: boolean;
  };
}

export interface ApiMeta {
  model: string;
  demo: boolean;
}

export type BadgeName =
  | "Civic Starter"
  | "Bronze Civic Champion"
  | "Silver Civic Champion"
  | "Gold Civic Champion"
  | "Platinum Civic Champion"
  | "Diamond Civic Champion";

export interface ContributionStats {
  issuesReported: number;
  issuesResolved: number;
  resolutionEvidence: number;
  communityValidations: number;
  duplicateFinds: number;
  impactCreated: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  profileComplete: boolean;
  authProvider?: "guest" | "email" | "google";
  about: string;
  city: string;
  district: string;
  state: string;
  country: string;
  avatarUrl?: string;
  xp: number;
  badge: BadgeName;
  stats: ContributionStats;
  createdAt: string;
  updatedAt: string;
}

export type XpAction =
  | "issue_reported"
  | "issue_verified"
  | "community_validation"
  | "duplicate_identified"
  | "resolution_evidence"
  | "resolution_verified"
  | "reported_issue_resolved"
  | "status_followup";

export interface XpEvent {
  id: string;
  userId: string;
  issueId: string;
  action: XpAction;
  points: number;
  label: string;
  createdAt: string;
}
