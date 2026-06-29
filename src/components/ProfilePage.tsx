import { useEffect, useMemo, useState } from "react";
import {
  badgeIcon,
  badgeProgress,
  listXpEvents,
  suggestedUsername,
  updateCurrentProfile,
} from "../communityRepository";
import type { CommunityIssue, UserProfile, XpEvent } from "../types";
import { formatDate } from "../utils";

interface ProfilePageProps {
  profile: UserProfile;
  issues: CommunityIssue[];
  forceSetup?: boolean;
  onProfileUpdated: (profile: UserProfile) => void;
  onOpenIssue: (issue: CommunityIssue) => void;
  onToast: (message: string) => void;
}

export function ProfilePage({
  profile,
  issues,
  forceSetup = false,
  onProfileUpdated,
  onOpenIssue,
  onToast,
}: ProfilePageProps) {
  const [editing, setEditing] = useState(forceSetup || !profile.profileComplete);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<XpEvent[]>([]);
  const [form, setForm] = useState({
    displayName: profile.displayName,
    username: profile.username || suggestedUsername(profile.displayName),
    about: profile.about,
    city: profile.city,
    district: profile.district,
    state: profile.state,
  });

  useEffect(() => {
    setEditing(forceSetup || !profile.profileComplete);
    setForm({
      displayName: profile.displayName,
      username: profile.username || suggestedUsername(profile.displayName),
      about: profile.about,
      city: profile.city,
      district: profile.district,
      state: profile.state,
    });
    void listXpEvents(profile.id).then(setEvents).catch(() => setEvents([]));
  }, [profile.id, forceSetup]);

  const ownIssues = useMemo(() => issues.filter((issue) => issue.reporterId === profile.id), [issues, profile.id]);
  const progress = badgeProgress(profile.xp);

  async function save() {
    if (form.displayName.trim().length < 2) {
      onToast("Add a display name with at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(form.username.trim().toLowerCase())) {
      onToast("Username must be 3–20 characters using lowercase letters, numbers or underscore only.");
      return;
    }
    if (form.city.trim().length < 2 || form.district.trim().length < 2 || form.state.trim().length < 2) {
      onToast("Add your city, district and state to complete your profile.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCurrentProfile({
        displayName: form.displayName.trim(),
        username: form.username.trim().toLowerCase(),
        about: form.about.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
      });
      onProfileUpdated(updated);
      setEditing(false);
      onToast(profile.profileComplete ? "Profile updated." : "Profile setup completed.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-page page-section">
      {forceSetup && (
        <article className="setup-notice-card">
          <span>👋</span>
          <div>
            <strong>Complete your Nagar Hero profile</strong>
            <p>Add your name, unique username and location before using the dashboard.</p>
          </div>
        </article>
      )}

      <article className="profile-hero-card">
        <div className="profile-identity">
          <span className="profile-avatar-xl">{profile.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <span className="eyebrow">Citizen profile</span>
            <h1>{profile.displayName}</h1>
            {profile.username && <span className="username-pill">@{profile.username}</span>}
            <p>{profile.about}</p>
            <div className="profile-location">📍 {profile.city}, {profile.district}, {profile.state}</div>
          </div>
        </div>
        {!forceSetup && (
          <button className="secondary-button" onClick={() => setEditing((value) => !value)}>
            {editing ? "Cancel editing" : "Edit profile"}
          </button>
        )}
      </article>

      {editing && (
        <article className="profile-edit-card">
          <div className="section-heading-row compact-heading">
            <div>
              <span className="eyebrow">Personalise your public identity</span>
              <h2>{forceSetup ? "Profile setup" : "Edit profile"}</h2>
            </div>
          </div>
          <div className="profile-form-grid">
            <label>
              <span>Display name</span>
              <input value={form.displayName} maxLength={60} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            </label>
            <label>
              <span>Unique username</span>
              <input
                value={form.username}
                maxLength={20}
                onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                placeholder="satyam_civic"
              />
              <small className="field-help">Use 3–20 lowercase letters, numbers or underscore. Example: @jhansi_hero</small>
            </label>
            <label className="profile-about-field">
              <span>About</span>
              <textarea rows={3} value={form.about} maxLength={240} onChange={(event) => setForm({ ...form, about: event.target.value })} />
            </label>
            <label>
              <span>City</span>
              <input value={form.city} maxLength={80} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            </label>
            <label>
              <span>District</span>
              <input value={form.district} maxLength={80} onChange={(event) => setForm({ ...form, district: event.target.value })} />
            </label>
            <label>
              <span>State</span>
              <input value={form.state} maxLength={80} onChange={(event) => setForm({ ...form, state: event.target.value })} />
            </label>
          </div>
          <button className="primary-button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving..." : forceSetup ? "Complete profile setup" : "Save profile"}
          </button>
        </article>
      )}

      <div className="profile-overview-grid">
        <article className="badge-card">
          <span className="badge-illustration">{badgeIcon(profile.badge)}</span>
          <div><span className="eyebrow">Current badge</span><h2>{profile.badge}</h2><p>{profile.xp} total XP</p></div>
          <div className="xp-progress-card">
            <div><strong>{profile.xp} XP</strong><span>{progress.next ? `${progress.nextTarget - profile.xp} XP remaining` : "All badge levels completed"}</span></div>
            <div className="xp-progress-track"><span style={{ width: `${progress.percent}%` }} /></div>
          </div>
        </article>
        <article className="impact-card">
          <span className="eyebrow">Civic impact</span>
          <h2>{profile.stats.impactCreated}</h2>
          <p>Impact points created through reports, validation and resolution evidence.</p>
        </article>
      </div>

      <div className="profile-stats-grid">
        <Metric label="Issues reported" value={profile.stats.issuesReported} icon="📢" />
        <Metric label="Issues resolved" value={profile.stats.issuesResolved} icon="✅" />
        <Metric label="Resolution evidence" value={profile.stats.resolutionEvidence} icon="📷" />
        <Metric label="Community validations" value={profile.stats.communityValidations} icon="🤝" />
        <Metric label="Duplicates identified" value={profile.stats.duplicateFinds} icon="⧉" />
        <Metric label="Total XP" value={profile.xp} icon="⚡" />
      </div>

      <div className="profile-content-grid">
        <article className="profile-list-card">
          <div className="section-heading-row compact-heading"><div><span className="eyebrow">Contribution history</span><h2>Recent XP activity</h2></div></div>
          {events.length ? (
            <ol className="activity-list">
              {events.slice(0, 12).map((event) => (
                <li key={event.id}><span className="activity-xp">+{event.points} XP</span><div><strong>{event.label}</strong><time>{formatDate(event.createdAt, "en-IN")}</time></div></li>
              ))}
            </ol>
          ) : (
            <div className="mini-empty">No XP activity yet. Publish or verify an issue to begin.</div>
          )}
        </article>

        <article className="profile-list-card">
          <div className="section-heading-row compact-heading"><div><span className="eyebrow">Your reports</span><h2>Reported issues</h2></div></div>
          {ownIssues.length ? (
            <div className="profile-issue-list">
              {ownIssues.slice(0, 8).map((issue) => (
                <button key={issue.id} onClick={() => onOpenIssue(issue)}>
                  <img src={issue.imageUrl} alt="" />
                  <span><strong>{issue.analysis.title}</strong><small>{issue.status} · {issue.location.address}</small></span>
                  <em>Open</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="mini-empty">No reports from this profile yet.</div>
          )}
        </article>
      </div>
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: string }) {
  return <article className="profile-metric"><span>{icon}</span><strong>{value}</strong><small>{label}</small></article>;
}
