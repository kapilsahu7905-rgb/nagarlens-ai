import { useState } from "react";

interface LoginPageProps {
  onGuestContinue: () => Promise<void>;
  onEmailAuth: (
    email: string,
    password: string,
    mode: "signin" | "signup",
  ) => Promise<void>;
}

export function LoginPage({ onGuestContinue, onEmailAuth }: LoginPageProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"guest" | "email" | "">("");
  const [message, setMessage] = useState("");

  async function continueGuest() {
    setLoading("guest");
    setMessage("");
    try {
      await onGuestContinue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not continue as guest.");
    } finally {
      setLoading("");
    }
  }

  async function submitEmail() {
    if (!email.includes("@") || password.length < 6) {
      setMessage("Enter a valid email and a password with at least 6 characters.");
      return;
    }
    setLoading("email");
    setMessage("");
    try {
      await onEmailAuth(email.trim(), password, mode);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email sign-in failed.");
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">N</span>
          <div>
            <strong>NagarLens AI</strong>
            <small>Report. Verify. Resolve.</small>
          </div>
        </div>

        <div className="login-copy">
          <span className="hero-badge">✦ Gemini-powered civic reporting</span>
          <h1>Join your city’s civic action network</h1>
          <p>
            Report local issues, verify community problems, earn XP and build your
            Nagar Hero profile. Continue as a guest for quick hackathon testing.
          </p>
        </div>

        <div className="login-actions-panel">
          <button
            className="primary-button login-wide-button"
            disabled={Boolean(loading)}
            onClick={() => void continueGuest()}
          >
            {loading === "guest" ? "Creating guest profile..." : "Continue as Guest"}
          </button>

          <button
            className="secondary-button login-wide-button"
            disabled={Boolean(loading)}
            onClick={() => setEmailOpen((value) => !value)}
          >
            Sign in with Email
          </button>

          <button
            className="secondary-button login-wide-button"
            disabled={Boolean(loading)}
            onClick={() =>
              setMessage(
                "Google sign-in is planned as an optional upgrade. Use Guest mode for judging and testing.",
              )
            }
          >
            Continue with Google
          </button>
        </div>

        {emailOpen && (
          <div className="email-login-box">
            <div className="email-mode-switch">
              <button className={mode === "signin" ? "selected" : ""} onClick={() => setMode("signin")}>Sign in</button>
              <button className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")}>Create account</button>
            </div>
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" />
            </label>
            <button className="primary-button login-wide-button" disabled={Boolean(loading)} onClick={() => void submitEmail()}>
              {loading === "email" ? "Checking..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
            <small>Email/password must be enabled in Firebase Authentication before this option can be used.</small>
          </div>
        )}

        {message && <div className="login-message">{message}</div>}

        <p className="login-judge-note">
  ✦ Proceed with Guest login for quick testing and hackathon judging.
</p>
      </section>
    </main>
  );
}
