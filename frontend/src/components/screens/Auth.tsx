import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  Sparkles,
  Building2,
  FileCheck2,
} from "lucide-react";
import { Button, Card, Field, IconButton } from "../shared/armor-ui";
import { WaveformVisualizer } from "../shared/DesignComponents";
import { loginUser, signupUser, updateProfile } from "@/lib/api";
import type { AuthUser, Screen } from "@/types/armor";

export function Auth({
  screen,
  go,
  onAuthed,
  theme,
  onToggleTheme,
}: {
  screen: "login" | "signup";
  go: (s: Screen) => void;
  onAuthed: (u: AuthUser) => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("India");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const doLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      onAuthed(await loginUser(loginEmail, loginPassword));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doSignup = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the terms to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await signupUser({
        email: contactEmail,
        password,
        name: contactName,
        company_name: orgName,
        role,
      });
      const notes = [
        orgType && `Type: ${orgType}`,
        industry && `Industry: ${industry}`,
        website && `Website: ${website}`,
        country && `Country: ${country}`,
        address && `Address: ${address}`,
        contactPhone && `Phone: ${contactPhone}`,
      ]
        .filter(Boolean)
        .join(" · ");
      if (notes) {
        try {
          await updateProfile(user.username, { notes });
        } catch {
          /* best effort */
        }
      }
      onAuthed(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (screen === "login") {
    return (
      <div
        className="auth-page"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          background: "var(--background)",
        }}
      >
        {/* Top-Right Theme Toggle */}
        {onToggleTheme && (
          <div style={{ position: "absolute", top: 20, right: 24, zIndex: 10 }}>
            <IconButton
              label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={onToggleTheme}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </IconButton>
          </div>
        )}

        {/* Left Editorial Column */}
        <aside
          style={{
            background: "var(--navy)",
            padding: "54px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRight: "1px solid var(--border)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Brand mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={theme === "dark" ? "/LOGO_Fair.png" : "/LOGO_Dark.png"}
              alt="Armor"
              style={{ width: 34, height: 34, objectFit: "contain" }}
            />
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.04em", color: "var(--foreground)" }}>
              ARMOR AI
            </span>
          </div>

          {/* Central Editorial Narrative */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 520 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "var(--primary)",
                textTransform: "uppercase",
              }}
            >
              CONTRACT INTELLIGENCE PLATFORM
            </span>

            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(2.4rem, 4vw, 3.6rem)",
                fontWeight: 400,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: "var(--foreground)",
                margin: 0,
              }}
            >
              Every conversation
              <br />
              <em>has a deal inside it.</em>
            </h1>

            <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
              ARMOR listens to customer and vendor business negotiations, extracts commercial terms, reconciles contradictions, and automatically generates verified counterparty agreements.
            </p>

            {/* Acoustic Waveform Visualization */}
            <div style={{ marginTop: 12 }}>
              <WaveformVisualizer active barCount={32} color="var(--primary)" />
            </div>

            {/* Workflow Progression Strip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 10,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--muted-foreground)",
              }}
            >
              <span>Negotiation</span>
              <ArrowRight size={13} className="text-primary" />
              <span>AI Verification</span>
              <ArrowRight size={13} className="text-primary" />
              <span>Executed Agreement</span>
            </div>
          </div>

          <footer style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            ARMOR AI Inc. · Enterprise Contract Intelligence
          </footer>
        </aside>

        {/* Right Form Column */}
        <main
          style={{
            display: "grid",
            placeItems: "center",
            padding: "40px 32px",
          }}
        >
          <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                Sign in to your organisation's ARMOR workspace.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field
                label="Work Email"
                icon={<Mail size={16} />}
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@company.com"
              />

              <label className="field">
                <span className="field__label">Password</span>
                <span className="field__control" style={{ position: "relative" }}>
                  <LockKeyhole size={16} />
                  <input
                    type={show ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    onClick={() => setShow(!show)}
                    type="button"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: 0,
                      color: "var(--muted-foreground)",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </span>
              </label>

              {error && (
                <p style={{ color: "var(--danger)", fontSize: 12, margin: 0, fontWeight: 600 }}>
                  {error}
                </p>
              )}

              <Button
                onClick={doLogin}
                loading={loading}
                style={{ height: 42, width: "100%", justifyContent: "center", fontSize: 13, marginTop: 4 }}
              >
                Sign In to Workspace <ArrowRight size={15} />
              </Button>

              <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", margin: "8px 0 0" }}>
                New to ARMOR?{" "}
                <button
                  onClick={() => go("signup")}
                  style={{
                    background: "none",
                    border: 0,
                    color: "var(--primary)",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Create organisation workspace
                </button>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Signup Screen (3-Step Onboarding)
  return (
    <div
      className="signup-page"
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          height: 64,
          borderBottom: "1px solid var(--border)",
          padding: "0 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--card)",
        }}
      >
        <button
          className="brand"
          onClick={() => go("login")}
          style={{
            background: "none",
            border: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="brand__mark">
            <img
              src={theme === "dark" ? "/LOGO_Fair.png" : "/LOGO_Dark.png"}
              alt="Armor"
              style={{ width: 28, height: 28, objectFit: "contain" }}
            />
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.04em", color: "var(--foreground)" }}>
            ARMOR AI
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onToggleTheme && (
            <IconButton
              label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={onToggleTheme}
              style={{ width: 32, height: 32 }}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </IconButton>
          )}
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Already registered?{" "}
            <button
              onClick={() => go("login")}
              style={{
                background: "none",
                border: 0,
                color: "var(--primary)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </span>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 640,
          width: "100%",
          margin: "40px auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--primary)",
              textTransform: "uppercase",
            }}
          >
            ORGANISATION ONBOARDING
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, margin: "4px 0 6px" }}>
            Set up your workspace.
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
            Armor uses your company and contact information to prepare accurate commercial agreements.
          </p>
        </div>

        {/* 3-Step Progress Pills */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {[
            { num: "01", label: "Organisation" },
            { num: "02", label: "Contact Details" },
            { num: "03", label: "Security & Pass" },
          ].map((s, idx) => {
            const isCurrent = step === idx + 1;
            const isPast = step > idx + 1;

            return (
              <div
                key={s.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: isCurrent ? "var(--primary)" : isPast ? "var(--success)" : "var(--border)",
                  background: isCurrent
                    ? "rgba(47, 129, 247, 0.1)"
                    : isPast
                    ? "rgba(35, 134, 54, 0.08)"
                    : "var(--navy-soft)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 800,
                    color: isCurrent ? "var(--primary)" : isPast ? "var(--success-text)" : "var(--muted-foreground)",
                  }}
                >
                  {s.num}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isCurrent ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Multi-step Form Card */}
        <Card
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 28,
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field
                label="Organisation Legal Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Apex Dynamics Ltd."
              />
              <Field
                label="Organisation Type"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                placeholder="Private Limited / LLP"
              />
              <Field
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Manufacturing / Logistics"
              />
              <Field
                label="Company Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="company.in"
              />
              <Field
                label="Country of Registration"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <Field
                label="Registered City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Mumbai, Maharashtra"
              />
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field
                label="Primary Contact Name"
                icon={<UserRound size={16} />}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
              />
              <Field
                label="Work Email"
                icon={<Mail size={16} />}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@company.in"
              />
              <Field
                label="Phone Number"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
              <Field
                label="Job Title / Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Managing Director"
              />
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field
                label="Master Password"
                icon={<LockKeyhole size={16} />}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <Field
                label="Confirm Password"
                icon={<LockKeyhole size={16} />}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                  color: "var(--foreground)",
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ accentColor: "var(--primary)" }}
                />
                <span>I acknowledge and accept ARMOR's commercial agreement terms &amp; privacy policy.</span>
              </label>
            </div>
          )}

          {error && (
            <p style={{ color: "var(--danger)", fontSize: 12, margin: 0, fontWeight: 600 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            {step > 1 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} /> Back
              </Button>
            ) : <span />}

            <Button
              loading={loading}
              onClick={() => (step < 3 ? setStep(step + 1) : doSignup())}
            >
              {step < 3 ? "Continue to Next Step" : "Create Organisation Workspace"}
              <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
