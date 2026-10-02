import { useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { Button, Field, IconButton } from "../shared/armor-ui";
import { loginUser, signupUser, updateProfile } from "@/lib/api";
import type { AuthUser, Screen } from "@/types/armor";

export function Auth({ screen, go, onAuthed, theme, onToggleTheme }: {
  screen: "login" | "signup"; go: (s: Screen) => void; onAuthed: (u: AuthUser) => void;
  theme?: "dark" | "light"; onToggleTheme?: () => void;
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
    setLoading(true); setError(null);
    try { onAuthed(await loginUser(loginEmail, loginPassword)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const doSignup = async () => {
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (!agreed) { setError("Please agree to the terms to continue."); return; }
    setLoading(true); setError(null);
    try {
      const user = await signupUser({ email: contactEmail, password, name: contactName, company_name: orgName, role });
      const notes = [
        orgType && `Type: ${orgType}`, industry && `Industry: ${industry}`, website && `Website: ${website}`,
        country && `Country: ${country}`, address && `Address: ${address}`, contactPhone && `Phone: ${contactPhone}`,
      ].filter(Boolean).join(" · ");
      if (notes) { try { await updateProfile(user.username, { notes }); } catch { /* best-effort */ } }
      onAuthed(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (screen === "login") {
    return (
      <div className="auth-page">
        {onToggleTheme && (
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
            <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </IconButton>
          </div>
        )}
        <aside className="auth-story">
          <button className="brand"><span className="brand__mark"><img src="/background_less_logo.png" alt="Armor" style={{ width: 26, height: 26, objectFit: "contain" }} /></span><span>ARMOR</span></button>
          <div>
            <span className="eyebrow">AGREEMENT INTELLIGENCE</span>
            <h1>Turn business conversations into agreements you can act on.</h1>
            <p>Understand the deal. Verify the terms. Track every financial commitment through completion.</p>
            <div className="auth-flow"><span>Conversation</span><ArrowRight /><span>Verified deal</span><ArrowRight /><span>Action</span></div>
          </div>
          <footer>Trusted workflow for accountable business agreements.</footer>
        </aside>
        <main className="auth-form">
          <div>
            <span className="mobile-brand">ARMOR</span>
            <h2>Welcome back</h2>
            <p>Sign in to your organisation workspace.</p>
            <Field label="Work email" icon={<Mail />} type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@company.in" />
            <label className="field"><span className="field__label">Password</span><span className="field__control"><LockKeyhole /><input type={show ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /><button onClick={() => setShow(!show)} type="button">{show ? "Hide" : "Show"}</button></span></label>
            {error && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>{error}</p>}
            <Button onClick={doLogin} loading={loading}>Sign In <ArrowRight /></Button>
            <p className="auth-switch">New to Armor? <button onClick={() => go("signup")}>Create organisation</button></p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <header>
        <button className="brand"><span className="brand__mark"><img src="/background_less_logo.png" alt="Armor" style={{ width: 26, height: 26, objectFit: "contain" }} /></span><span>ARMOR</span></button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onToggleTheme && (
            <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </IconButton>
          )}
          <span>Already have an account? <button onClick={() => go("login")}>Sign in</button></span>
        </div>
      </header>
      <main>
        <div className="signup-head"><span className="eyebrow">CREATE YOUR WORKSPACE</span><h1>Set up your organisation</h1><p>Armor uses these details to prepare trusted business agreements.</p></div>
        <div className="steps"><span className={step >= 1 ? "active" : ""}>1 <b>Organisation</b></span><i /><span className={step >= 2 ? "active" : ""}>2 <b>Contact</b></span><i /><span className={step >= 3 ? "active" : ""}>3 <b>Security</b></span></div>
        <div className="surface-card signup-card">
          {step === 1 && (
            <div className="form-grid">
              <Field label="Organisation name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Vertex Commerce" />
              <Field label="Organisation type" value={orgType} onChange={(e) => setOrgType(e.target.value)} placeholder="Private Limited" />
              <Field label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industrial Supply" />
              <Field label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="company.in" />
              <Field label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
              <Field label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, State" />
            </div>
          )}
          {step === 2 && (
            <div className="form-grid">
              <Field label="Primary contact name" icon={<UserRound />} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" />
              <Field label="Primary contact email" icon={<Mail />} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="name@company.in" />
              <Field label="Primary contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
              <Field label="Role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director" />
            </div>
          )}
          {step === 3 && (
            <>
              <Field label="Password" icon={<LockKeyhole />} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Field label="Confirm password" icon={<LockKeyhole />} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <label className="terms"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />I agree to Armor's terms and privacy policy.</label>
            </>
          )}
          {error && <p style={{ color: "var(--danger)", fontSize: 11, margin: "8px 0" }}>{error}</p>}
          <div className="signup-actions">
            {step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}><ArrowLeft />Back</Button>}
            <Button loading={loading} onClick={() => (step < 3 ? setStep(step + 1) : doSignup())}>{step < 3 ? "Continue" : "Create Workspace"}<ArrowRight /></Button>
          </div>
        </div>
      </main>
    </div>
  );
}
