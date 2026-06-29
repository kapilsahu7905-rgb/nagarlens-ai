import { useEffect, useMemo, useState } from "react";
import { awardXp, ensureCurrentProfile, getProfile, startEmailAuthProfile, subscribeProfiles } from "./communityRepository";
import { Dashboard } from "./components/Dashboard";
import { Header } from "./components/Header";
import { HomeDashboard } from "./components/HomeDashboard";
import { IssueDetail } from "./components/IssueDetail";
import { LoginPage } from "./components/LoginPage";
import { NagarHero } from "./components/NagarHero";
import { ProfilePage } from "./components/ProfilePage";
import { PublicProfile } from "./components/PublicProfile";
import { ReportForm } from "./components/ReportForm";
import { Stats } from "./components/Stats";
import { useText } from "./i18n";
import { persistenceMode, subscribeIssues } from "./repository";
import type { AppView, CommunityIssue, Language, UserProfile } from "./types";

const AUTH_STARTED_KEY = "nagarlens_auth_started_v1";

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("nagarlens_language") as Language) || "en");
  const [authStarted, setAuthStarted] = useState(() => localStorage.getItem(AUTH_STARTED_KEY) === "1");
  const [view, setView] = useState<AppView>("dashboard");
  const [issues, setIssues] = useState<CommunityIssue[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedProfileId, setSelectedProfileId] = useState<string>();
  const [toast, setToast] = useState("");
  const t = useText(language);

  useEffect(() => {
    if (!authStarted) return () => {};
    return subscribeIssues(setIssues);
  }, [authStarted]);

  useEffect(() => {
    if (!authStarted) {
      setCurrentProfile(undefined);
      setProfiles([]);
      return () => {};
    }

    let mounted = true;
    let unsubscribe: () => void = () => {};

    void ensureCurrentProfile().then((profile) => {
      if (!mounted) return;
      setCurrentProfile(profile);
      if (!profile.profileComplete) setView("profile");
      unsubscribe = subscribeProfiles((items) => {
        setProfiles(items);
        const updatedCurrent = items.find((item) => item.id === profile.id);
        if (updatedCurrent) setCurrentProfile(updatedCurrent);
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [authStarted]);
  useEffect(() => localStorage.setItem("nagarlens_language", language), [language]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedIssue = useMemo(() => issues.find((issue) => issue.id === selectedId), [issues, selectedId]);
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedProfileId), [profiles, selectedProfileId]);

  function navigate(nextView: AppView) {
    setView(nextView);
    setSelectedId(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  async function continueAsGuest() {
    localStorage.setItem(AUTH_STARTED_KEY, "1");
    setAuthStarted(true);
    const profile = await ensureCurrentProfile();
    setCurrentProfile(profile);
    setView("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function authenticateWithEmail(email: string, password: string, mode: "signin" | "signup") {
    const profile = await startEmailAuthProfile(email, password, mode);
    localStorage.setItem(AUTH_STARTED_KEY, "1");
    setAuthStarted(true);
    setCurrentProfile(profile);
    setView(profile.profileComplete ? "dashboard" : "profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreated(issue: CommunityIssue) {
    setIssues((current) => [issue, ...current.filter((item) => item.id !== issue.id)]);
    const result = await awardXp({
      issueId: issue.id,
      action: "issue_reported",
      points: 20,
      label: `Published an AI-validated report: ${issue.analysis.title}`,
      statsDelta: { issuesReported: 1, impactCreated: 20 },
    });
    setCurrentProfile(result.profile);
    setSelectedId(issue.id);
    setView("board");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openProfile(profileId: string) {
    if (profileId === currentProfile?.id) {
      navigate("profile");
      return;
    }
    const existing = profiles.find((profile) => profile.id === profileId) || (await getProfile(profileId));
    if (existing) {
      if (!profiles.some((profile) => profile.id === existing.id)) setProfiles((items) => [...items, existing]);
      setSelectedProfileId(existing.id);
    } else {
      setToast("This public profile is not available yet.");
    }
  }

  if (!authStarted) {
    return <LoginPage onGuestContinue={continueAsGuest} onEmailAuth={authenticateWithEmail} />;
  }

  if (!currentProfile) {
    return <div className="app-loading"><span className="spinner" /><strong>Preparing NagarLens AI...</strong></div>;
  }

  return (
    <div className="app-shell">
      <Header language={language} onLanguageChange={setLanguage} activeView={view} onViewChange={navigate} profile={currentProfile} />
      <main>
        {view === "dashboard" && (
          <>
            <section className="hero">
              <div className="container hero-grid">
                <div className="hero-copy">
                  <span className="hero-badge">✦ {t.aiBadge}</span>
                  <h1>{t.heroTitle}</h1>
                  <p>{t.heroText}</p>
                  <div className="hero-actions">
                    <button className="primary-button" onClick={() => navigate("report")}>{t.startReport} →</button>
                    <button className="secondary-button" onClick={() => navigate("board")}>{t.viewIssues}</button>
                  </div>
                  <div className={`mode-banner ${persistenceMode === "firebase" ? "mode-live" : ""}`}>
                    <span>{persistenceMode === "firebase" ? "☁️" : "💻"}</span>
                    <div><strong>{persistenceMode === "firebase" ? t.sharedMode : t.localMode}</strong>{persistenceMode === "local" && <small>{t.localWarning}</small>}</div>
                  </div>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="visual-map"><span className="map-road road-one" /><span className="map-road road-two" /><span className="map-pin pin-one">🕳️</span><span className="map-pin pin-two">💧</span><span className="map-pin pin-three">💡</span><div className="ai-scan"><span>✦</span><strong>Gemini civic analysis</strong><small>Validate → Route → Act</small></div></div>
                </div>
              </div>
            </section>
            <div className="container main-content">
              <Stats issues={issues} language={language} />
              <HomeDashboard issues={issues} language={language} profile={currentProfile} onNavigate={navigate} onOpenIssue={(issue) => setSelectedId(issue.id)} onOpenProfile={(id) => void openProfile(id)} />
            </div>
          </>
        )}

        {view !== "dashboard" && (
          <div className="container standalone-content">
            {view === "report" && <ReportForm language={language} issues={issues} currentProfile={currentProfile} onCreated={(issue) => void handleCreated(issue)} onToast={setToast} />}
            {view === "board" && <Dashboard issues={issues} language={language} onOpen={(issue) => setSelectedId(issue.id)} onOpenProfile={(id) => void openProfile(id)} />}
            {view === "heroes" && <NagarHero profiles={profiles} currentProfile={currentProfile} onOpenProfile={(id) => void openProfile(id)} />}
            {view === "profile" && <ProfilePage profile={currentProfile} issues={issues} forceSetup={!currentProfile.profileComplete} onProfileUpdated={setCurrentProfile} onOpenIssue={(issue) => setSelectedId(issue.id)} onToast={setToast} />}
          </div>
        )}
      </main>

      <footer><div className="container"><strong>NagarLens AI</strong><span>{t.reportDisclaimer}</span><small>Built with Google AI Studio, Gemini, Firebase and OpenStreetMap for Vibe2Ship 2026.</small></div></footer>

      {selectedIssue && <IssueDetail issue={selectedIssue} language={language} currentProfile={currentProfile} onClose={() => setSelectedId(undefined)} onToast={setToast} onOpenProfile={(id) => { setSelectedId(undefined); void openProfile(id); }} />}
      {selectedProfile && <PublicProfile profile={selectedProfile} issues={issues} onClose={() => setSelectedProfileId(undefined)} onOpenIssue={(issue) => { setSelectedProfileId(undefined); setSelectedId(issue.id); }} />}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}
