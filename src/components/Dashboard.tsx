import { useMemo, useState } from "react";
import type { CommunityIssue, IssueCategory, IssueStatus, Language } from "../types";
import { useText } from "../i18n";
import { CommunityMap } from "./CommunityMap";
import { IssueCard } from "./IssueCard";

const categories: (IssueCategory | "all")[] = [
  "all",
  "Pothole",
  "Water Leakage",
  "Damaged Streetlight",
  "Waste Management",
  "Open Drain",
  "Road Damage",
  "Fallen Tree",
  "Public Infrastructure",
  "Other",
];
const statuses: (IssueStatus | "all")[] = [
  "all",
  "Reported",
  "Verified",
  "Forwarded",
  "In Progress",
  "Resolved",
  "Reinspection Required",
];

interface DashboardProps {
  issues: CommunityIssue[];
  language: Language;
  onOpen: (issue: CommunityIssue) => void;
  onOpenProfile: (profileId: string) => void;
}

export function Dashboard({ issues, language, onOpen, onOpenProfile }: DashboardProps) {
  const t = useText(language);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IssueCategory | "all">("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const matchesQuery =
        !query ||
        [
          issue.analysis.title,
          issue.analysis.summary,
          issue.location.address,
          issue.analysis.category,
          issue.reporterName || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return (
        matchesQuery &&
        (category === "all" || issue.analysis.category === category) &&
        (status === "all" || issue.status === status)
      );
    });
  }, [issues, search, category, status]);

  const mappedCount = filtered.filter(
    (issue) => issue.location.latitude != null && issue.location.longitude != null,
  ).length;

  return (
    <section className="dashboard-section page-section">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">Community transparency</span>
          <h2>{t.communityBoard}</h2>
          <p>See ongoing reports, community verification, map evidence and resolution progress.</p>
        </div>
      </div>

      <div className="filters">
        <label className="search-field">
          <span>⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value as IssueCategory | "all")} aria-label="Category filter">
          {categories.map((item) => (
            <option key={item} value={item}>{item === "all" ? t.allCategories : item}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as IssueStatus | "all")} aria-label="Status filter">
          {statuses.map((item) => (
            <option key={item} value={item}>{item === "all" ? t.allStatuses : item}</option>
          ))}
        </select>
      </div>

      <div className="community-map-section">
        <div className="community-map-heading">
          <div>
            <span className="eyebrow">Live issue locations</span>
            <h3>Community issue map</h3>
          </div>
          <span className="mapped-count">{mappedCount} mapped</span>
        </div>
        <CommunityMap issues={filtered} onOpen={onOpen} />
      </div>

      {filtered.length ? (
        <div className="issue-grid">
          {filtered.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              language={language}
              onOpen={() => onOpen(issue)}
              onOpenProfile={issue.reporterId ? () => onOpenProfile(issue.reporterId!) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state"><span>🔎</span><h3>{t.noIssues}</h3></div>
      )}
    </section>
  );
}
