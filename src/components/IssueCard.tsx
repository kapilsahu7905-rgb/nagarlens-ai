import type { CommunityIssue, Language } from "../types";
import { useText } from "../i18n";
import { categoryIcon, formatDate } from "../utils";

interface IssueCardProps {
  issue: CommunityIssue;
  language: Language;
  onOpen: () => void;
  onOpenProfile?: () => void;
}

export function IssueCard({ issue, language, onOpen, onOpenProfile }: IssueCardProps) {
  const t = useText(language);
  return (
    <article className="issue-card">
      <div className="issue-image-wrap">
        <img src={issue.imageUrl} alt={issue.analysis.title} className="issue-image" />
        <span className={`severity-badge severity-${issue.analysis.severity.toLowerCase()}`}>{issue.analysis.severity}</span>
      </div>
      <div className="issue-card-body">
        <div className="issue-meta-row">
          <span>{categoryIcon(issue.analysis.category)} {issue.analysis.category}</span>
          <span className="status-pill">{issue.status}</span>
        </div>
        <h3>{issue.analysis.title}</h3>
        <p className="issue-summary">{issue.analysis.summary}</p>
        <p className="location-line">📍 {issue.location.address || "Coordinates provided"}</p>
        <button
          type="button"
          className="reporter-link"
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile?.();
          }}
          disabled={!onOpenProfile}
        >
          <span className="mini-avatar">{(issue.reporterName || "C").slice(0, 1).toUpperCase()}</span>
          <span>Reported by <strong>{issue.reporterName || "Community Member"}</strong></span>
        </button>
        <div className="issue-card-footer">
          <span>🤝 {issue.confirmations}</span>
          <time dateTime={issue.createdAt}>{formatDate(issue.createdAt, language === "hi" ? "hi-IN" : "en-IN")}</time>
        </div>
        <button className="secondary-button full-width" onClick={onOpen}>{t.openDetails}</button>
      </div>
    </article>
  );
}
