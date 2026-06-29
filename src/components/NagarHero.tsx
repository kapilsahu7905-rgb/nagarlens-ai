import { useMemo, useState } from "react";
import { badgeIcon, badgeProgress } from "../communityRepository";
import type { UserProfile } from "../types";

interface NagarHeroProps {
  profiles: UserProfile[];
  currentProfile: UserProfile;
  onOpenProfile: (profileId: string) => void;
}

type Scope = "local" | "district" | "india";
type Metric = "xp" | "reports" | "resolved" | "contributions";

export function NagarHero({ profiles, currentProfile, onOpenProfile }: NagarHeroProps) {
  const [scope, setScope] = useState<Scope>("local");
  const [metric, setMetric] = useState<Metric>("xp");

  const ranked = useMemo(() => {
    const scoped = profiles.filter((profile) => {
      if (scope === "india") return profile.country === "India";
      if (scope === "district") return profile.district.toLowerCase() === currentProfile.district.toLowerCase();
      return profile.city.toLowerCase() === currentProfile.city.toLowerCase();
    });
    const value = (profile: UserProfile) => {
      if (metric === "reports") return profile.stats.issuesReported;
      if (metric === "resolved") return profile.stats.issuesResolved;
      if (metric === "contributions") return profile.stats.communityValidations + profile.stats.resolutionEvidence + profile.stats.duplicateFinds;
      return profile.xp;
    };
    return [...scoped].sort((a, b) => value(b) - value(a));
  }, [profiles, scope, metric, currentProfile.city, currentProfile.district]);

  const currentRank = ranked.findIndex((profile) => profile.id === currentProfile.id) + 1;
  const progress = badgeProgress(currentProfile.xp);

  return (
    <section className="nagar-hero-page page-section">
      <div className="hero-leaderboard-banner">
        <div>
          <span className="eyebrow">Gamified civic participation</span>
          <h1>Nagar Hero</h1>
          <p>Earn XP by reporting genuine issues, verifying evidence and helping confirm real resolutions.</p>
        </div>
        <div className="current-rank-card">
          <span>{badgeIcon(currentProfile.badge)}</span>
          <div><small>Your {scope} rank</small><strong>{currentRank ? `#${currentRank}` : "Unranked"}</strong><em>{currentProfile.xp} XP</em></div>
        </div>
      </div>

      <div className="hero-progress-grid">
        <article className="hero-progress-card">
          <div><span className="badge-illustration">{badgeIcon(currentProfile.badge)}</span><div><span className="eyebrow">Current badge</span><h2>{currentProfile.badge}</h2></div></div>
          <div className="xp-progress-card">
            <div><strong>{currentProfile.xp} XP</strong><span>{progress.next ? `${progress.nextTarget - currentProfile.xp} XP to ${progress.next}` : "Diamond level reached"}</span></div>
            <div className="xp-progress-track"><span style={{ width: `${progress.percent}%` }} /></div>
          </div>
        </article>
        <article className="xp-rules-card">
          <span className="eyebrow">How XP works</span>
          <ul>
            <li><strong>+20</strong><span>AI-validated issue report</span></li>
            <li><strong>+3</strong><span>Community verification</span></li>
            <li><strong>+5</strong><span>Correct duplicate flag</span></li>
            <li><strong>+20</strong><span>Useful resolution evidence</span></li>
            <li><strong>+50</strong><span>Verified resolution</span></li>
          </ul>
        </article>
      </div>

      <article className="leaderboard-card">
        <div className="leaderboard-controls">
          <div className="segmented-control" aria-label="Ranking scope">
            <button className={scope === "local" ? "selected" : ""} onClick={() => setScope("local")}>Local</button>
            <button className={scope === "district" ? "selected" : ""} onClick={() => setScope("district")}>District</button>
            <button className={scope === "india" ? "selected" : ""} onClick={() => setScope("india")}>India</button>
          </div>
          <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)} aria-label="Ranking metric">
            <option value="xp">Overall XP</option>
            <option value="reports">Issues reported</option>
            <option value="resolved">Issues resolved</option>
            <option value="contributions">Community contributions</option>
          </select>
        </div>

        <div className="leaderboard-heading-row">
          <div><span className="eyebrow">{scope} champions</span><h2>{scope === "local" ? currentProfile.city : scope === "district" ? currentProfile.district : "India"} leaderboard</h2></div>
          <span className="mapped-count">{ranked.length} citizens</span>
        </div>

        {ranked.length ? (
          <ol className="leaderboard-list">
            {ranked.map((profile, index) => {
              const contributionTotal = profile.stats.communityValidations + profile.stats.resolutionEvidence + profile.stats.duplicateFinds;
              const metricValue = metric === "reports" ? profile.stats.issuesReported : metric === "resolved" ? profile.stats.issuesResolved : metric === "contributions" ? contributionTotal : profile.xp;
              return (
                <li key={profile.id} className={profile.id === currentProfile.id ? "current-user-row" : ""}>
                  <span className={`rank-number rank-${index + 1}`}>{index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}</span>
                  <button className="leaderboard-person" onClick={() => onOpenProfile(profile.id)}>
                    <span className="leader-avatar">{profile.displayName.slice(0, 1).toUpperCase()}</span>
                    <span><strong>{profile.displayName}{profile.id === currentProfile.id ? " (You)" : ""}</strong><small>{profile.city}, {profile.state}</small></span>
                  </button>
                  <span className="leader-badge">{badgeIcon(profile.badge)} <span>{profile.badge.replace(" Civic Champion", "")}</span></span>
                  <span className="leader-metric"><strong>{metricValue}</strong><small>{metric === "xp" ? "XP" : metric}</small></span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="empty-state compact-empty"><span>🏁</span><h3>No ranked citizens in this scope yet</h3><p>Complete a contribution to become the first Nagar Hero here.</p></div>
        )}
      </article>

      <article className="badge-gallery-card">
        <div className="section-heading-row compact-heading"><div><span className="eyebrow">Milestones</span><h2>Civic Champion badges</h2></div></div>
        <div className="badge-gallery">
          <Badge icon="🌱" name="Civic Starter" xp="0 XP" unlocked />
          <Badge icon="🥉" name="Bronze" xp="100 XP" unlocked={currentProfile.xp >= 100} />
          <Badge icon="🥈" name="Silver" xp="300 XP" unlocked={currentProfile.xp >= 300} />
          <Badge icon="🥇" name="Gold" xp="700 XP" unlocked={currentProfile.xp >= 700} />
          <Badge icon="🏆" name="Platinum" xp="1,500 XP" unlocked={currentProfile.xp >= 1500} />
          <Badge icon="💎" name="Diamond" xp="3,000 XP" unlocked={currentProfile.xp >= 3000} />
        </div>
      </article>
    </section>
  );
}

function Badge({ icon, name, xp, unlocked }: { icon: string; name: string; xp: string; unlocked: boolean }) {
  return <div className={`badge-tile ${unlocked ? "badge-unlocked" : "badge-locked"}`}><span>{unlocked ? icon : "🔒"}</span><strong>{name}</strong><small>{xp}</small></div>;
}
