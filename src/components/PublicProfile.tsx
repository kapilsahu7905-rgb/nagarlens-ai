import { badgeIcon } from "../communityRepository";
import type { CommunityIssue, UserProfile } from "../types";
import { formatDate } from "../utils";

interface PublicProfileProps {
  profile: UserProfile;
  issues: CommunityIssue[];
  onClose: () => void;
  onOpenIssue: (issue: CommunityIssue) => void;
}

export function PublicProfile({ profile, issues, onClose, onOpenIssue }: PublicProfileProps) {
  const reported = issues.filter((issue) => issue.reporterId === profile.id);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="public-profile-modal" role="dialog" aria-modal="true" aria-labelledby="public-profile-name">
        <button className="modal-close" onClick={onClose} aria-label="Close profile">×</button>
        <div className="public-profile-hero">
          <span className="profile-avatar-xl">{profile.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <span className="eyebrow">Public Nagar profile</span>
            <h2 id="public-profile-name">{profile.displayName}</h2>
            <p>{profile.about}</p>
            <small>📍 {profile.city}, {profile.district}, {profile.state}</small>
          </div>
          <div className="public-badge"><span>{badgeIcon(profile.badge)}</span><strong>{profile.badge}</strong><small>{profile.xp} XP</small></div>
        </div>

        <div className="profile-stats-grid public-stats">
          <Metric label="Issues reported" value={profile.stats.issuesReported} icon="📢" />
          <Metric label="Issues resolved" value={profile.stats.issuesResolved} icon="✅" />
          <Metric label="Community validations" value={profile.stats.communityValidations} icon="🤝" />
          <Metric label="Impact created" value={profile.stats.impactCreated} icon="🌍" />
        </div>

        <section className="public-profile-reports">
          <div className="section-heading-row compact-heading"><div><span className="eyebrow">Public work</span><h2>Issues reported by {profile.displayName}</h2></div></div>
          {reported.length ? (
            <div className="profile-issue-list">
              {reported.map((issue) => (
                <button key={issue.id} onClick={() => onOpenIssue(issue)}>
                  <img src={issue.imageUrl} alt="" />
                  <span><strong>{issue.analysis.title}</strong><small>{issue.status} · {formatDate(issue.createdAt, "en-IN")}</small></span>
                  <em>Open</em>
                </button>
              ))}
            </div>
          ) : <div className="mini-empty">No public reports are currently linked to this profile.</div>}
        </section>
      </article>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: string }) {
  return <article className="profile-metric"><span>{icon}</span><strong>{value}</strong><small>{label}</small></article>;
}
