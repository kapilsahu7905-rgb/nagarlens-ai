import { LocationPinMap } from "./LocationPinMap";
import { useMemo, useRef, useState } from "react";
import exifr from "exifr";
import { analyzeIssue } from "../api";
import { useText } from "../i18n";
import { saveIssue, uploadIssueImage } from "../repository";
import type { ApiMeta, CommunityIssue, IssueAnalysis, IssueLocation, Language, UserProfile } from "../types";
import { compressImage, findPotentialDuplicates, makeId } from "../utils";

interface ReportFormProps {
  language: Language;
  issues: CommunityIssue[];
  currentProfile: UserProfile;
  onCreated: (issue: CommunityIssue) => void;
  onToast: (message: string) => void;
}

export function ReportForm({ language, issues, currentProfile, onCreated, onToast }: ReportFormProps) {
  const t = useText(language);
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [photoCoordinates, setPhotoCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [readingPhotoLocation, setReadingPhotoLocation] = useState(false);
  const [photoLocationMessage, setPhotoLocationMessage] = useState("");
  const [analysis, setAnalysis] = useState<IssueAnalysis>();
  const [meta, setMeta] = useState<ApiMeta>();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [authorityEmail, setAuthorityEmail] = useState("");

  const location: IssueLocation = useMemo(() => ({ address, latitude, longitude }), [address, latitude, longitude]);
  const duplicates = useMemo(
    () => (analysis ? findPotentialDuplicates(issues, analysis.category, location) : []),
    [analysis, issues, location],
  );

  async function handleFile(file?: File) {
    if (!file) return;
    setReadingPhotoLocation(true);
    setPhotoLocationMessage("");
    setPhotoCoordinates(undefined);
    try {
      setError("");
      setAnalysis(undefined);
      setMeta(undefined);
      const [gpsResult, compressedImage] = await Promise.all([
        exifr.gps(file).catch(() => undefined),
        compressImage(file),
      ]);
      setImageDataUrl(compressedImage);
      if (gpsResult && Number.isFinite(gpsResult.latitude) && Number.isFinite(gpsResult.longitude)) {
        const coordinates = {
          latitude: Number(gpsResult.latitude.toFixed(6)),
          longitude: Number(gpsResult.longitude.toFixed(6)),
        };
        setPhotoCoordinates(coordinates);
        setPhotoLocationMessage("GPS location found in this photo.");
      } else {
        setPhotoLocationMessage("This photo does not contain GPS location data.");
      }
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Could not process the image.");
    } finally {
      setReadingPhotoLocation(false);
    }
  }

  function usePhotoGpsLocation() {
    if (!photoCoordinates) return;
    setLatitude(photoCoordinates.latitude);
    setLongitude(photoCoordinates.longitude);
    setPhotoLocationMessage(`Photo GPS selected: ${photoCoordinates.latitude}, ${photoCoordinates.longitude}`);
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      (locationError) => {
        setError(locationError.message || "Location permission was denied.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }
  function usePinnedLocation(
  pickedLatitude: number,
  pickedLongitude: number,
) {
  setLatitude(pickedLatitude);
  setLongitude(pickedLongitude);
  setAnalysis(undefined);
  setError("");
}

  async function runAnalysis() {
    if (!imageDataUrl) {
      setError("Upload a clear issue photo first.");
      return;
    }
    if (description.trim().length < 3) {
      setError("Add a short description of the issue.");
      return;
    }
    if (!address.trim() && (latitude == null || longitude == null)) {
      setError(
  "Add a landmark, use current location, apply photo GPS, or pin the issue location on the map.",
);
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(undefined);
    try {
      const result = await analyzeIssue({
        imageDataUrl,
        description: description.trim(),
        language,
        location: { address: address.trim(), latitude, longitude },
      });
      setAnalysis(result.analysis);
      setMeta(result.meta);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function publishReport() {
    if (!analysis?.isValidIssue) return;
    const now = new Date().toISOString();
    const id = makeId("issue");
    setPublishing(true);
    setError("");
    try {
      const imageUrl = await uploadIssueImage(imageDataUrl, `issues/${id}/before.jpg`);
      const issue: CommunityIssue = {
        id,
        description: description.trim(),
        imageUrl,
        location: {
          address: address.trim() || `${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`,
          latitude,
          longitude,
        },
        analysis,
        status: "Reported",
        confirmations: 0,
        disputes: 0,
        duplicateFlags: 0,
        potentialDuplicateIds: duplicates.map((item) => item.id),
        createdAt: now,
        updatedAt: now,
        reporterId: currentProfile.id,
        reporterName: currentProfile.displayName,
        timeline: [
          {
            id: makeId("event"),
            label: language === "hi" ? "समस्या रिपोर्ट की गई" : "Issue reported",
            detail:
              language === "hi"
                ? "Gemini विश्लेषण पूरा हुआ और रिपोर्ट सामुदायिक बोर्ड पर प्रकाशित हुई।"
                : "Gemini analysis completed and the report was published to the community board.",
            createdAt: now,
          },
        ],
        aiMeta: meta ?? { model: "unknown", demo: false },
      };
      await saveIssue(issue);
      onCreated(issue);
      onToast(t.publishSuccess);
      resetForm();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not publish the report.");
    } finally {
      setPublishing(false);
    }
  }

  function resetForm() {
    setImageDataUrl("");
    setDescription("");
    setAddress("");
    setLatitude(undefined);
    setLongitude(undefined);
    setMapPickerOpen(false);
    setPhotoCoordinates(undefined);
    setPhotoLocationMessage("");
    setAuthorityEmail("");
    setAnalysis(undefined);
    setMeta(undefined);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function copyComplaint() {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis.complaintLetter);
    onToast(t.copied);
  }
  function buildAuthorityEmail() {
  if (!analysis) {
    return {
      subject: "",
      body: "",
    };
  }

  const reporterName =
    currentProfile.displayName?.trim() || "A concerned citizen";

  const locationText =
    location.latitude != null && location.longitude != null
      ? `${location.address || "The reported location"}\nCoordinates: ${location.latitude}, ${location.longitude}`
      : location.address || "Location details are provided in the report.";

  const issueName = analysis.category.toLowerCase();

  const subject = `Request for inspection and repair of ${issueName} at ${
    location.address || "reported location"
  }`;

  const riskText =
    analysis.safetyRisks.length > 0
      ? analysis.safetyRisks
          .slice(0, 2)
          .join(" and ")
          .toLowerCase()
      : "public inconvenience and safety concerns";

  const body = `Respected Sir/Madam,

I am writing to bring to your attention a civic issue in our area that needs your department's inspection.

There is a ${issueName} at the location mentioned below. ${description.trim() || analysis.summary}

Location:
${locationText}

This issue may cause ${riskText}. It may also create difficulty for local residents, pedestrians, and commuters if it is not addressed soon.

As per the report details, this issue appears to be related to the ${analysis.suggestedDepartment}. I request you to kindly arrange an inspection and take the necessary action at the earliest.

The issue has also been reported on the NagarLens community platform so that local citizens can track its progress and provide verification if required.

Thank you for your time and support.

Yours faithfully,
${reporterName}`;

  return {
    subject,
    body,
  };
}

async function copyAuthorityEmail() {
  const email = buildAuthorityEmail();

  if (!email.body) {
    return;
  }

  await navigator.clipboard.writeText(
    `Subject: ${email.subject}\n\n${email.body}`,
  );

  onToast("Authority email draft copied.");
}

function openGmailDraft() {
  const email = buildAuthorityEmail();

  if (!email.body) {
    return;
  }

  const gmailUrl = new URL(
    "https://mail.google.com/mail/",
  );

  gmailUrl.searchParams.set("view", "cm");
  gmailUrl.searchParams.set("fs", "1");

  if (authorityEmail.trim()) {
    gmailUrl.searchParams.set(
      "to",
      authorityEmail.trim(),
    );
  }

  gmailUrl.searchParams.set("su", email.subject);
  gmailUrl.searchParams.set("body", email.body);

  window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
}

  return (
    <section className="report-layout page-section">
      <div className="report-intro">
        <span className="eyebrow">AI-guided civic intake</span>
        <h2>{t.reportTitle}</h2>
        <p>{t.reportSubtitle}</p>
        <ol className="process-list">
          <li><span>1</span><div><strong>Evidence</strong><small>Upload a clear photo and location.</small></div></li>
          <li><span>2</span><div><strong>Intelligence</strong><small>Gemini validates, categorizes and routes.</small></div></li>
          <li><span>3</span><div><strong>Action</strong><small>Publish, verify, follow up and resolve.</small></div></li>
        </ol>
        <div className="xp-tip"><span>+20 XP</span><p>Earn XP after a valid report is published. Duplicate or invalid reports do not earn points.</p></div>
      </div>

      <div className="report-panel">
        <div className="form-section">
          <label className="field-label">{t.uploadPhoto}</label>
          <button type="button" className={`upload-zone ${imageDataUrl ? "has-image" : ""}`} onClick={() => fileInput.current?.click()}>
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Selected civic issue" />
            ) : (
              <><span className="upload-icon">📷</span><strong>{t.uploadPhoto}</strong><small>{t.photoHint}</small></>
            )}
          </button>
          <input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleFile(event.target.files?.[0])} />
        </div>

        <div className="form-section">
          <label className="field-label" htmlFor="description">{t.description}</label>
          <textarea id="description" rows={4} maxLength={1200} value={description} onChange={(event) => { setDescription(event.target.value); setAnalysis(undefined); }} placeholder={t.descriptionPlaceholder} />
          <small className="character-count">{description.length}/1200</small>
        </div>

        <div className="form-section">
          <label className="field-label" htmlFor="address">{t.address}</label>
          <input id="address" value={address} maxLength={300} onChange={(event) => setAddress(event.target.value)} placeholder={t.addressPlaceholder} />
          <div className="location-row">
            <button type="button" className="text-button" onClick={getCurrentLocation} disabled={locating}>{locating ? t.locating : `⌖ ${t.useLocation}`}</button>
            {latitude != null && longitude != null && <span className="location-ok">✓ {t.coordinatesReady}: {latitude}, {longitude}</span>}
          </div>
          <div className="location-row">
  <button
    type="button"
    className="text-button"
    onClick={() => setMapPickerOpen((value) => !value)}
  >
    📍 {mapPickerOpen ? "Hide map picker" : "Pin location on map"}
  </button>
</div>

{mapPickerOpen && (
  <LocationPinMap
    latitude={latitude}
    longitude={longitude}
    onPick={usePinnedLocation}
  />
)}
          {readingPhotoLocation && <div className="photo-location-status">Reading location information from the photo...</div>}
          {!readingPhotoLocation && photoLocationMessage && (
            <div className="photo-location-card">
              <div>
                <strong>{photoCoordinates ? "Photo location available" : "Photo location unavailable"}</strong>
                <p>{photoLocationMessage}</p>
                {photoCoordinates && <small>Latitude: {photoCoordinates.latitude}<br />Longitude: {photoCoordinates.longitude}</small>}
              </div>
              {photoCoordinates && <button type="button" className="secondary-button" onClick={usePhotoGpsLocation}>Use photo GPS</button>}
            </div>
          )}
        </div>

        {error && <div className="error-banner" role="alert">⚠️ <span>{error}</span></div>}
        {!analysis && (
          <button className="primary-button full-width" onClick={() => void runAnalysis()} disabled={loading}>
            {loading ? <><span className="spinner" /> {t.analyzing}</> : `✦ ${t.analyze}`}
          </button>
        )}

        {analysis && (
          <div className={`analysis-card ${analysis.isValidIssue ? "" : "analysis-invalid"}`}>
            <div className="analysis-header">
              <div><span className="eyebrow">{t.analysisTitle}</span><h3>{analysis.title}</h3></div>
              <span className={`severity-badge severity-${analysis.severity.toLowerCase()}`}>{analysis.severity}</span>
            </div>
            {meta?.demo && <div className="demo-banner"><strong>{t.demoMode}</strong><span>{t.demoWarning}</span></div>}
            <p className="validation-line">{analysis.isValidIssue ? "✓" : "⚠"} {analysis.validationMessage}</p>
            <p>{analysis.summary}</p>
            <div className="analysis-facts">
              <div><small>Category</small><strong>{analysis.category}</strong></div>
              <div><small>{t.urgency}</small><strong>{analysis.urgency}</strong></div>
              <div><small>{t.confidence}</small><strong>{Math.round(analysis.confidence * 100)}%</strong></div>
            </div>
            <div className="department-box"><span>🏛️</span><div><small>{t.likelyDepartment}</small><strong>{analysis.suggestedDepartment}</strong></div></div>
            {analysis.safetyRisks.length > 0 && <div className="analysis-list"><h4>{t.risks}</h4><ul>{analysis.safetyRisks.map((risk) => <li key={risk}>{risk}</li>)}</ul></div>}
            <div className="analysis-list"><h4>{t.actions}</h4><ol>{analysis.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ol></div>
            <div className="complaint-box">
              <div className="box-heading"><h4>{t.complaint}</h4><button className="text-button" onClick={() => void copyComplaint()}>{t.copy}</button></div>
              <pre>{analysis.complaintLetter}</pre>
            </div>
            <div className="authority-email-box">
  <div className="box-heading">
    <div>
      <h4>Draft email to responsible authority</h4>
      <small>
        Opens Gmail with a ready-to-review civic complaint.
        The user sends it manually.
      </small>
    </div>
  </div>

  <label className="field-label" htmlFor="authorityEmail">
    Authority email address
  </label>

  <input
    id="authorityEmail"
    type="email"
    value={authorityEmail}
    onChange={(event) =>
      setAuthorityEmail(event.target.value)
    }
    placeholder="Example: commissioner@city.gov.in"
  />

  <div className="authority-email-preview">
    <small>Suggested department</small>
    <strong>{analysis.suggestedDepartment}</strong>
  </div>

  <div className="button-row">
    <button
      type="button"
      className="secondary-button"
      onClick={() => void copyAuthorityEmail()}
    >
      Copy email draft
    </button>

    <button
      type="button"
      className="primary-button"
      onClick={openGmailDraft}
    >
      Open Gmail Draft
    </button>
  </div>

  <p className="email-note">
    This does not auto-send any email. Gmail opens so the
    citizen can review and send it safely.
  </p>
</div>
            
            {duplicates.length > 0 && (
              <div className="duplicate-box">
                <h4>⚠️ {t.duplicates}</h4><p>{t.duplicatesHint}</p>
                {duplicates.map((item) => <div className="duplicate-item" key={item.id}><img src={item.imageUrl} alt="" /><div><strong>{item.analysis.title}</strong><small>{item.location.address} · 🤝 {item.confirmations}</small></div></div>)}
              </div>
            )}
            <div className="button-row">
              <button className="secondary-button" onClick={resetForm}>{t.reset}</button>
              <button className="primary-button" onClick={() => void publishReport()} disabled={!analysis.isValidIssue || publishing}>{publishing ? t.publishing : t.publish}</button>
            </div>
          </div>
        )}
        <p className="form-disclaimer">{t.reportDisclaimer}</p>
      </div>
    </section>
  );
}
