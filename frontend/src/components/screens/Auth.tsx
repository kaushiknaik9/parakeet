import { useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Moon, Sun, UserRound, Building2 } from "lucide-react";
import { Button, Field, IconButton } from "../shared/armor-ui";
import { loginUser, signupUser } from "@/lib/api";
import type { AuthUser, Screen } from "@/types/armor";

export function Auth({ screen, go, onAuthed, theme, onToggleTheme }: {
  screen: "login" | "signup"; go: (s: Screen) => void; onAuthed: (u: AuthUser) => void;
  theme?: "dark" | "light"; onToggleTheme?: () => void;
}) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // signup fields
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("Private Limited");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("India");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [role, setRole] = useState("Director");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(true);

  const doLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setError("Please enter your work email and password.");
      return;
    }
    setLoading(true); setError(null);
    try {
      onAuthed(await loginUser(loginEmail, loginPassword));
    } catch (e: any) {
      setError(e.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const doSignup = async () => {
    if (!contactEmail || !password) {
      setError("Work email and password are required.");
      return;
    }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (!agreed) { setError("Please agree to the terms to continue."); return; }

    setLoading(true); setError(null);
    try {
      const user = await signupUser({
        email: contactEmail,
        password,
        name: contactName || contactEmail.split("@")[0],
        company_name: orgName || "Workspace",
        role,
      });
      onAuthed(user);
    } catch (e: any) {
      setError(e.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  if (screen === "login") {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative bg-background font-sans">
        {onToggleTheme && (
          <div className="absolute top-4 right-4 z-20">
            <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </IconButton>
          </div>
        )}

        {/* Left Dark Story Panel */}
        <aside className="bg-[#0D1117] text-[#F0F6FC] p-8 lg:p-14 flex flex-col justify-between border-r border-[#30363D]">
          <div className="flex items-center gap-3">
            <img src="/LOGO_Fair.png" alt="Armor" className="w-9 h-9 object-contain" />
            <span className="text-xl font-extrabold tracking-tight">ARMOR</span>
          </div>

          <div className="my-12 max-w-lg">
            <span className="text-xs font-bold uppercase tracking-widest text-[#58A6FF] mb-3 block">
              AGREEMENT INTELLIGENCE
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Turn business conversations into agreements you can act on.
            </h1>
            <p className="text-base text-[#8B949E] leading-relaxed mb-8">
              Understand the deal. Verify the terms. Track every financial commitment through completion.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#C9D1D9]">
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">Conversation</span>
              <ArrowRight size={14} className="text-[#58A6FF]" />
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">Verified deal</span>
              <ArrowRight size={14} className="text-[#58A6FF]" />
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">Action</span>
            </div>
          </div>

          <footer className="text-xs text-[#8B949E]">
            Trusted workflow for accountable business agreements.
          </footer>
        </aside>

        {/* Right Form Panel */}
        <main className="flex items-center justify-center p-6 lg:p-12 bg-card">
          <div className="w-full max-w-md space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to your organisation workspace.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); doLogin(); }} className="space-y-4">
              <Field
                label="Work email"
                icon={<Mail size={15} />}
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@company.in"
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground pointer-events-none">
                    <LockKeyhole size={15} />
                  </span>
                  <input
                    type={show ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-14 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                  />
                  <button
                    onClick={() => setShow(!show)}
                    type="button"
                    className="absolute right-3 text-xs font-semibold text-primary hover:underline"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}

              <Button
                type="submit"
                loading={loading}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all mt-2"
              >
                Sign In <ArrowRight size={16} />
              </Button>

              <div className="text-center pt-2">
                <span className="text-xs text-muted-foreground">
                  New to Armor?{" "}
                  <button
                    type="button"
                    onClick={() => go("signup")}
                    className="text-xs font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Create organisation
                  </button>
                </span>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Dark Header */}
      <header className="h-16 bg-[#0D1117] border-b border-[#30363D] px-6 lg:px-12 flex items-center justify-between text-white">
        <button onClick={() => go("login")} className="flex items-center gap-3 bg-transparent border-0 cursor-pointer">
          <img src="/LOGO_Fair.png" alt="Armor" className="w-8 h-8 object-contain" />
          <span className="text-lg font-extrabold tracking-tight text-white">ARMOR</span>
        </button>

        <div className="flex items-center gap-4 text-xs">
          {onToggleTheme && (
            <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </IconButton>
          )}
          <span className="text-gray-300">
            Already have an account?{" "}
            <button onClick={() => go("login")} className="font-bold text-[#58A6FF] hover:underline bg-transparent border-0 cursor-pointer ml-1">
              Sign in
            </button>
          </span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
            CREATE YOUR WORKSPACE
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
            Set up your organisation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Armor uses these details to prepare trusted business agreements.
          </p>
        </div>

        {/* Numbered Progress Steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all border-0 cursor-pointer ${
              step >= 1 ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
            <b>Organisation</b>
          </button>

          <div className={`w-8 h-px ${step >= 2 ? "bg-primary" : "bg-border"}`} />

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all border-0 cursor-pointer ${
              step >= 2 ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
            <b>Contact</b>
          </button>

          <div className={`w-8 h-px ${step >= 3 ? "bg-primary" : "bg-border"}`} />

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all border-0 cursor-pointer ${
              step >= 3 ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">3</span>
            <b>Security</b>
          </button>
        </div>

        {/* Form Grid Card */}
        <div className="bg-card border border-border rounded-xl p-6 lg:p-8 shadow-sm space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Organisation name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Vertex Commerce" />
              <Field label="Organisation type" value={orgType} onChange={(e) => setOrgType(e.target.value)} placeholder="Private Limited" />
              <Field label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industrial Supply" />
              <Field label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="company.in" />
              <Field label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
              <Field label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, State" />
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Primary contact name" icon={<UserRound size={15} />} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full name" />
              <Field label="Primary contact email" icon={<Mail size={15} />} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="name@company.in" />
              <Field label="Primary contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
              <Field label="Role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director" />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="Password" icon={<LockKeyhole size={15} />} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <Field label="Confirm password" icon={<LockKeyhole size={15} />} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-2">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                I agree to Armor's terms and privacy policy.
              </label>
            </div>
          )}

          {error && <p className="text-xs text-danger font-medium">{error}</p>}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            {step > 1 ? (
              <Button variant="secondary" onClick={() => setStep((step - 1) as any)}>
                <ArrowLeft size={15} /> Back
              </Button>
            ) : <div />}

            <Button loading={loading} onClick={() => (step < 3 ? setStep((step + 1) as any) : doSignup())}>
              {step < 3 ? "Continue" : "Create Workspace"} <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
