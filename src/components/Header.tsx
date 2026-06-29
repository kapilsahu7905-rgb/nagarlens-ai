import { useState } from "react";
import type { AppView, Language, UserProfile } from "../types";
import { badgeIcon } from "../communityRepository";
import { useText } from "../i18n";

interface HeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  profile: UserProfile;
}

const navItems: Array<{ view: AppView; label: string; icon: string }> = [
  { view: "dashboard", label: "Dashboard", icon: "⌂" },
  { view: "report", label: "Report an Issue", icon: "＋" },
  { view: "board", label: "Community Board", icon: "◉" },
  { view: "heroes", label: "Nagar Hero", icon: "★" },
  { view: "profile", label: "Profile", icon: "●" },
];

export function Header({ language, onLanguageChange, activeView, onViewChange, profile }: HeaderProps) {
  const t = useText(language);
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(view: AppView) {
    setMenuOpen(false);
    onViewChange(view);
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu" aria-expanded={menuOpen}>
            <span /><span /><span />
          </button>
          <button className="brand" onClick={() => navigate("dashboard")} aria-label="NagarLens home">
            <span className="brand-mark" aria-hidden="true">N</span>
            <span><strong>{t.brand}</strong><small>{t.tagline}</small></span>
          </button>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.slice(0, 4).map((item) => (
              <button key={item.view} className={activeView === item.view ? "nav-active" : ""} onClick={() => navigate(item.view)}>{item.label}</button>
            ))}
          </nav>
          <div className="header-actions">
            <div className="language-switch" aria-label="Language">
              <button className={language === "en" ? "selected" : ""} onClick={() => onLanguageChange("en")}>EN</button>
              <button className={language === "hi" ? "selected" : ""} onClick={() => onLanguageChange("hi")}>हिं</button>
            </div>
            <button className="header-profile" onClick={() => navigate("profile")} aria-label="Open profile">
              <span className="header-avatar">{profile.displayName.slice(0, 1).toUpperCase()}</span>
              <span><strong>{profile.displayName}</strong><small>{profile.username ? `@${profile.username} · ` : ""}{profile.xp} XP · {badgeIcon(profile.badge)}</small></span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && <button className="drawer-backdrop" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`navigation-drawer ${menuOpen ? "drawer-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="drawer-header">
          <div className="brand compact-brand"><span className="brand-mark">N</span><span><strong>NagarLens AI</strong><small>Report. Verify. Resolve.</small></span></div>
          <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
        </div>
        <button className="drawer-profile-card" onClick={() => navigate("profile")}>
          <span className="drawer-avatar">{profile.displayName.slice(0, 1).toUpperCase()}</span>
          <span><strong>{profile.displayName}</strong><small>{profile.username ? `@${profile.username}` : `${badgeIcon(profile.badge)} ${profile.badge}`}</small><em>{profile.xp} XP</em></span>
        </button>
        <nav className="drawer-nav" aria-label="Application sections">
          {navItems.map((item) => (
            <button key={item.view} className={activeView === item.view ? "drawer-active" : ""} onClick={() => navigate(item.view)}>
              <span>{item.icon}</span><strong>{item.label}</strong>
            </button>
          ))}
        </nav>
        <div className="drawer-note"><strong>Built for civic action</strong><p>Use AI responsibly. Validate evidence before sharing public reports.</p></div>
      </aside>
    </>
  );
}
