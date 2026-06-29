import { useEffect, useRef, useState } from "react";
import { generateFollowup, verifyResolution } from "../api";
import { awardXp, revokeXp } from "../communityRepository";
import { useText } from "../i18n";
import {
  getVerificationState,
  setPrimaryVerification,
  toggleDuplicateVerification,
  updateIssue,
  uploadIssueImage,
} from "../repository";
import type { VerificationState } from "../repository";
import type { CommunityIssue, Followup, IssueStatus, Language, UserProfile } from "../types";
import { categoryIcon, compressImage, daysBetween, formatDate, makeId } from "../utils";
import { MapEmbed } from "./MapEmbed";

interface IssueDetailProps {
  issue: CommunityIssue;
  language: Language;
  currentProfile: UserProfile;
  onClose: () => void;
  onToast: (message: string) => void;
  onOpenProfile: (profileId: string) => void;
}

export function IssueDetail({ issue, language, currentProfile, onClose, onToast, onOpenProfile }: IssueDetailProps) {
  const t = useText(language);
  const resolutionInput = useRef<HTMLInputElement>(null);
  const [afterImage, setAfterImage] = useState("");
  const [followup, setFollowup] = useState<Followup>();
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const [verificationState, setVerificationState] = useState<VerificationState>({ primary: null, duplicate: false });

  useEffect(() => {
    let cancelled = false;
    void getVerificationState(issue.id)
      .then((savedState) => { if (!cancelled) setVerificationState(savedState); })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load verification state."); });
    return () => { cancelled = true; };
  }, [issue.id]);

  async function choosePrimaryVerification(choice: "confirm" | "dispute") {
    setLoadingAction(choice);
    setError("");
    const hadPrimary = verificationState.primary != null;
    const withdrawing = verificationState.primary === choice;
    try {
      const nextState = await setPrimaryVerification(issue.id, choice);
      setVerificationState(nextState);
      if (!hadPrimary && nextState.primary) {
        await awardXp({
          issueId: issue.id,
          action: "community_validation",
          points: 3,
          label: `Community verification: ${issue.analysis.title}`,
          statsDelta: { communityValidations: 1, impactCreated: 3 },
        });
      } else if (withdrawing && nextState.primary == null) {
        await revokeXp({
          issueId: issue.id,
          action: "community_validation",
          points: 3,
          label: `Community verification: ${issue.analysis.title}`,
          statsDelta: { communityValidations: 1, impactCreated: 3 },
        });
      }
      onToast(withdrawing ? "Your response was withdrawn." : choice === "confirm" ? "You confirmed that this issue exists. +3 XP" : "Your cannot-confirm response was recorded. +3 XP");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update verification.");
    } finally {
      setLoadingAction("");
    }
  }

  async function toggleDuplicateFlag() {
    setLoadingAction("duplicate");
    setError("");
    const wasSelected = verificationState.duplicate;
    try {
      const nextState = await toggleDuplicateVerification(issue.id);
      setVerificationState(nextState);
      const xpOptions = {
        issueId: issue.id,
        action: "duplicate_identified" as const,
        points: 5,
        label: `Duplicate review: ${issue.analysis.title}`,
        statsDelta: { duplicateFinds: 1, impactCreated: 5 },
      };
      if (nextState.duplicate) await awardXp(xpOptions);
      else await revokeXp(xpOptions);
      onToast(wasSelected ? "Duplicate flag removed and XP adjusted." : "Issue flagged as a possible duplicate. +5 XP");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update duplicate flag.");
    } finally {
      setLoadingAction("");
    }
  }

  async function createFollowup() {
    setLoadingAction("followup");
    setError("");
    try {
      const result = await generateFollowup({
        title: issue.analysis.title,
        summary: issue.analysis.summary,
        category: issue.analysis.category,
        severity: issue.analysis.severity,
        department: issue.analysis.suggestedDepartment,
        daysOpen: daysBetween(issue.createdAt),
        confirmations: issue.confirmations,
        language,
      });
      setFollowup(result.followup);
      const award = await awardXp({
        issueId: issue.id,
        action: "status_followup",
        points: 5,
        label: `Prepared a responsible follow-up: ${issue.analysis.title}`,
        statsDelta: { impactCreated: 5 },
      });
      if (award.awarded) onToast("Follow-up generated. +5 XP");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not create the follow-up.");
    } finally {
      setLoadingAction("");
    }
  }

  async function selectAfterPhoto(file?: File) {
    if (!file) return;
    try {
      setError("");
      setAfterImage(await compressImage(file));
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Could not process the image.");
    }
  }

  async function runResolutionCheck() {
    if (!afterImage) {
      setError("Upload an after-resolution image first.");
      return;
    }
    setLoadingAction("resolution");
    setError("");
    try {
      const beforeDataUrl = await imageUrlToDataUrl(issue.imageUrl);
      const result = await verifyResolution({
        beforeImageDataUrl: beforeDataUrl,
        afterImageDataUrl: afterImage,
        originalTitle: issue.analysis.title,
        originalSummary: issue.analysis.summary,
        language,
      });
      const resolutionImageUrl = await uploadIssueImage(afterImage, `issues/${issue.id}/resolution.jpg`);
      const status = statusFromResolution(result.analysis.resolutionStatus);
      const now = new Date().toISOString();
      const event = {
        id: makeId("event"),
        label: language === "hi" ? "समाधान फोटो सत्यापित हुई" : "Resolution evidence reviewed",
        detail: `${result.analysis.resolutionStatus}: ${result.analysis.explanation}`,
        createdAt: now,
      };
      const withoutPriorResolutionReview = issue.timeline.filter((item) => item.label !== "Resolution evidence reviewed" && item.label !== "समाधान फोटो सत्यापित हुई");
      await updateIssue(issue.id, {
        resolutionImageUrl,
        resolutionAnalysis: result.analysis,
        resolutionContributorId: currentProfile.id,
        resolutionContributorName: currentProfile.displayName,
        status,
        updatedAt: now,
        timeline: [...withoutPriorResolutionReview, event],
      });

      const evidenceAward = await awardXp({
        issueId: issue.id,
        action: "resolution_evidence",
        points: 20,
        label: `Uploaded resolution evidence: ${issue.analysis.title}`,
        statsDelta: { resolutionEvidence: 1, impactCreated: 20 },
      });
      let message = evidenceAward.awarded ? "Resolution evidence saved. +20 XP" : "Resolution assessment updated.";

      if (result.analysis.resolutionStatus === "Resolved") {
        const resolverAward = await awardXp({
          issueId: issue.id,
          action: "resolution_verified",
          points: 50,
          label: `Verified resolution: ${issue.analysis.title}`,
          statsDelta: { issuesResolved: 1, impactCreated: 50 },
        });
        if (resolverAward.awarded) message += " +50 XP for verified resolution.";
        if (issue.reporterId === currentProfile.id) {
          await awardXp({
            issueId: issue.id,
            action: "reported_issue_resolved",
            points: 40,
            label: `Your reported issue was resolved: ${issue.analysis.title}`,
            statsDelta: { impactCreated: 40 },
          });
        }
      }
      onToast(message);
      setAfterImage("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Resolution verification failed.");
    } finally {
      setLoadingAction("");
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    onToast(t.copied);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="issue-title">
        <button className="modal-close" onClick={onClose} aria-label={t.close}>×</button>
        <div className="detail-hero">
          <img src={issue.imageUrl} alt={issue.analysis.title} />
          <div className="detail-hero-overlay">
            <span className={`severity-badge severity-${issue.analysis.severity.toLowerCase()}`}>{issue.analysis.severity}</span>
            <span className="status-pill">{issue.status}</span>
          </div>
        </div>

        <div className="detail-content">
          <div className="detail-title-row">
            <div>
              <span className="eyebrow">{categoryIcon(issue.analysis.category)} {issue.analysis.category}</span>
              <h2 id="issue-title">{issue.analysis.title}</h2>
              <p className="location-line">📍 {issue.location.address}</p>
              {issue.reporterId && (
                <button className="reporter-link detail-reporter" onClick={() => onOpenProfile(issue.reporterId!)}>
                  <span className="mini-avatar">{(issue.reporterName || "C").slice(0, 1).toUpperCase()}</span>
                  <span>Reported by <strong>{issue.reporterName || "Community Member"}</strong></span>
                </button>
              )}
            </div>
            <div className="confidence-ring" aria-label={`AI confidence ${Math.round(issue.analysis.confidence * 100)} percent`}>
              <strong>{Math.round(issue.analysis.confidence * 100)}%</strong><small>AI confidence</small>
            </div>
          </div>

          {issue.aiMeta.demo && <div className="demo-banner"><strong>{t.demoMode}</strong><span>{t.demoWarning}</span></div>}
          {error && <div className="error-banner" role="alert">⚠️ <span>{error}</span></div>}

          <div className="detail-grid">
            <section className="detail-main">
              <div className="content-block"><h3>Issue assessment</h3><p>{issue.analysis.summary}</p></div>
              <div className="analysis-facts">
                <div><small>{t.urgency}</small><strong>{issue.analysis.urgency}</strong></div>
                <div><small>{t.likelyDepartment}</small><strong>{issue.analysis.suggestedDepartment}</strong></div>
                <div><small>Reported</small><strong>{formatDate(issue.createdAt, language === "hi" ? "hi-IN" : "en-IN")}</strong></div>
              </div>
              <div className="content-block"><h3>{t.risks}</h3><ul className="clean-list">{issue.analysis.safetyRisks.map((risk) => <li key={risk}>⚠ {risk}</li>)}</ul></div>
              <div className="content-block"><h3>{t.actions}</h3><ol className="action-list">{issue.analysis.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ol></div>
              <div className="complaint-box">
                <div className="box-heading"><h3>{t.complaint}</h3><button className="text-button" onClick={() => void copyText(issue.analysis.complaintLetter)}>{t.copy}</button></div>
                <pre>{issue.analysis.complaintLetter}</pre>
              </div>
              <div className="content-block">
                <div className="box-heading"><h3>{t.followupTitle}</h3><button className="secondary-button compact" onClick={() => void createFollowup()} disabled={loadingAction === "followup"}>{loadingAction === "followup" ? t.generatingFollowup : `✦ ${t.followup}`}</button></div>
                {followup ? <div className="followup-box"><div><span className="status-pill">{followup.escalationLevel}</span><small>Check again in {followup.nextCheckDays} day(s)</small></div><h4>{followup.subject}</h4><p>{followup.message}</p><button className="text-button" onClick={() => void copyText(`${followup.subject}\n\n${followup.message}`)}>{t.copy}</button></div> : <p className="muted">Gemini can prepare a respectful evidence-based reminder. It will not send anything automatically.</p>}
              </div>
              <div className="resolution-block">
                <div className="box-heading"><div><span className="eyebrow">Before ↔ After</span><h3>{t.verifyResolution}</h3></div><span className="xp-chip">Up to +70 XP</span></div>
                {issue.resolutionAnalysis && <div className="resolution-result"><span className="large-result-icon">{issue.resolutionAnalysis.resolutionStatus === "Resolved" ? "✅" : issue.resolutionAnalysis.resolutionStatus === "Unclear" ? "❓" : "🛠️"}</span><div><strong>{issue.resolutionAnalysis.resolutionStatus}</strong><p>{issue.resolutionAnalysis.explanation}</p><small>{Math.round(issue.resolutionAnalysis.confidence * 100)}% confidence · {issue.resolutionAnalysis.recommendedAction}</small></div></div>}
                <div className="before-after-grid">
                  <figure><img src={issue.imageUrl} alt="Original issue" /><figcaption>Original evidence</figcaption></figure>
                  <button className={`after-upload ${afterImage ? "has-image" : ""}`} onClick={() => resolutionInput.current?.click()}>{afterImage ? <img src={afterImage} alt="After resolution evidence" /> : <><span>📷</span><strong>{t.afterPhoto}</strong></>}</button>
                </div>
                <input ref={resolutionInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectAfterPhoto(event.target.files?.[0])} />
                <button className="primary-button full-width" disabled={!afterImage || loadingAction === "resolution"} onClick={() => void runResolutionCheck()}>{loadingAction === "resolution" ? t.verifying : `✦ ${t.verifyResolution}`}</button>
              </div>
            </section>

            <aside className="detail-side">
              <div className="side-card">
                <h3>Community verification</h3>
                <div className="verification-count"><strong>{issue.confirmations}</strong><span>citizens confirm</span></div>
                <div className="stack-buttons">
                  <button className={`primary-button ${verificationState.primary === "confirm" ? "verification-selected" : ""}`} aria-pressed={verificationState.primary === "confirm"} disabled={Boolean(loadingAction)} onClick={() => void choosePrimaryVerification("confirm")}>{verificationState.primary === "confirm" ? "✓ Withdraw confirmation" : `✓ ${t.confirm}`}</button>
                  <button className={`secondary-button ${verificationState.primary === "dispute" ? "verification-selected" : ""}`} aria-pressed={verificationState.primary === "dispute"} disabled={Boolean(loadingAction)} onClick={() => void choosePrimaryVerification("dispute")}>{verificationState.primary === "dispute" ? "? Withdraw response" : `? ${t.cannotConfirm}`}</button>
                  <button className={`text-button danger-text ${verificationState.duplicate ? "duplicate-selected" : ""}`} aria-pressed={verificationState.duplicate} disabled={Boolean(loadingAction)} onClick={() => void toggleDuplicateFlag()}>{verificationState.duplicate ? "⧉ Remove duplicate flag" : `⧉ ${t.markDuplicate}`}</button>
                </div>
                <div className="signal-row"><span>Cannot confirm: {issue.disputes}</span><span>Duplicate flags: {issue.duplicateFlags}</span></div>
              </div>
              <div className="side-card"><h3>{t.map}</h3><MapEmbed location={issue.location} language={language} /></div>
              <div className="side-card"><h3>{t.timeline}</h3><ol className="timeline">{[...issue.timeline].reverse().map((event) => <li key={event.id}><span /><div><strong>{event.label}</strong><p>{event.detail}</p><time>{formatDate(event.createdAt, language === "hi" ? "hi-IN" : "en-IN")}</time></div></li>)}</ol></div>
            </aside>
          </div>
        </div>
      </article>
    </div>
  );
}

function statusFromResolution(value: "Resolved" | "Partially Resolved" | "Not Resolved" | "Unclear"): IssueStatus {
  if (value === "Resolved") return "Resolved";
  if (value === "Not Resolved") return "In Progress";
  return "Reinspection Required";
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not retrieve the original evidence image.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not process the original evidence image."));
    reader.readAsDataURL(blob);
  });
}
