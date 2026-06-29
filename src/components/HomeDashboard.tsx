import type { AppView, CommunityIssue, Language, UserProfile } from "../types";
import { badgeIcon, badgeProgress } from "../communityRepository";
import { IssueCard } from "./IssueCard";

interface HomeDashboardProps {
  issues: CommunityIssue[];
  language: Language;
  profile: UserProfile;
  onNavigate: (view: AppView) => void;
  onOpenIssue: (issue: CommunityIssue) => void;
  onOpenProfile: (profileId: string) => void;
}

export function HomeDashboard({
  issues,
  language,
  profile,
  onNavigate,
  onOpenIssue,
  onOpenProfile,
}: HomeDashboardProps) {
  const ownIssues = issues.filter((issue) => issue.reporterId === profile.id);
  const recentIssues = ownIssues.slice(0, 3);
  const progress = badgeProgress(profile.xp);
  const resolved = ownIssues.filter((issue) => issue.status === "Resolved").length;
  const open = ownIssues.filter((issue) => issue.status !== "Resolved").length;

  return (
    <section className="home-dashboard page-section">
      <div className="dashboard-welcome-grid">
        <article className="profile-summary-card">
          <div className="profile-summary-top">
            <span className="large-avatar">{profile.displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <span className="eyebrow">Your civic journey</span>
              <h2>{profile.displayName}</h2>
              <p>{badgeIcon(profile.badge)} {profile.badge}</p>
            </div>
            <button className="text-button" onClick={() => onNavigate("profile")}>Edit profile</button>
          </div>
          <div className="xp-progress-card">
            <div><strong>{profile.xp} XP</strong><span>{progress.next ? `${progress.nextTarget - profile.xp} XP to ${progress.next}` : "Top badge unlocked"}</span></div>
            <div className="xp-progress-track"><span style={{ width: `${progress.percent}%` }} /></div>
          </div>
          <div className="dashboard-stat-row">
            <div><strong>{ownIssues.length}</strong><span>Reported</span></div>
            <div><strong>{resolved}</strong><span>Resolved</span></div>
            <div><strong>{profile.stats.impactCreated}</strong><span>Impact</span></div>
          </div>
        </article>

        <article className="quick-actions-card">
          <span className="eyebrow">Take action now</span>
          <h2>What would you like to do?</h2>
          <div className="quick-action-grid">
            <button onClick={() => onNavigate("report")}><span>📷</span><strong>Report an issue</strong><small>Upload evidence and let Gemini route it.</small></button>
            <button onClick={() => onNavigate("board")}><span>🗺️</span><strong>Explore community</strong><small>Verify reports and inspect the live map.</small></button>
            <button onClick={() => onNavigate("heroes")}><span>🏆</span><strong>See Nagar Heroes</strong><small>View local, district and India rankings.</small></button>
          </div>
        </article>
      </div>

      <div className="personal-tracker-card">
        <div className="section-heading-row compact-heading">
          <div><span className="eyebrow">Your issue tracker</span><h2>Track your reported issues</h2><p>{open} open · {resolved} resolved</p></div>
          <button className="secondary-button" onClick={() => onNavigate("board")}>View full community board</button>
        </div>
        {recentIssues.length ? (
          <div className="issue-grid">
            {recentIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                language={language}
                onOpen={() => onOpenIssue(issue)}
                onOpenProfile={issue.reporterId ? () => onOpenProfile(issue.reporterId!) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <span>📍</span><h3>No personal reports yet</h3><p>Publish your first verified civic report and earn 20 XP.</p>
            <button className="primary-button" onClick={() => onNavigate("report")}>Start a report</button>
          </div>
        )}
      </div>
    </section>
  );
}
