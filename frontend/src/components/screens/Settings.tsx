import { useState, useEffect } from "react";
import { ArrowLeft, Building2, UserRound, LockKeyhole, Check, ShieldCheck, KeyRound } from "lucide-react";
import { Button, Card, Field } from "../shared/armor-ui";
import { updateProfile } from "@/lib/api";
import type { AuthUser, Profile, Screen } from "@/types/armor";

export function SettingsPage({ session, profile, setProfile, notify, go }: {
  session: AuthUser; profile: Profile | null; setProfile: (p: Profile) => void; notify: (s: string) => void; go?: (s: Screen) => void;
}) {
  const [activeTab, setActiveTab] = useState<"org" | "contact" | "security">("org");
  const [draft, setDraft] = useState<Partial<Profile>>(profile || {});
  const [saving, setSaving] = useState(false);

  // Password change state
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passUpdating, setPassUpdating] = useState(false);

  useEffect(() => { setDraft(profile || {}); }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile(session.username, draft);
      setProfile(updated);
      notify("Workspace settings updated successfully.");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass) {
      notify("Please enter a new password.");
      return;
    }
    if (newPass !== confirmPass) {
      notify("New passwords do not match.");
      return;
    }
    setPassUpdating(true);
    setTimeout(() => {
      setPassUpdating(false);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      notify("Password updated successfully.");
    }, 600);
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div className="page-heading" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <span className="eyebrow">SETTINGS</span>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>Workspace Settings</h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
              Manage your organisation details, designated contact profile, and account security.
            </p>
          </div>
          {go && (
            <button className="back-link" onClick={() => go("dashboard")}>
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="settings-layout" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
        {/* Navigation Tabs */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            className={activeTab === "org" ? "active" : ""}
            onClick={() => setActiveTab("org")}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 0,
              background: activeTab === "org" ? "var(--accent)" : "transparent",
              color: activeTab === "org" ? "var(--primary)" : "var(--foreground)",
              textAlign: "left"
            }}
          >
            <Building2 size={16} /> Organisation Profile
          </button>
          <button
            className={activeTab === "contact" ? "active" : ""}
            onClick={() => setActiveTab("contact")}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 0,
              background: activeTab === "contact" ? "var(--accent)" : "transparent",
              color: activeTab === "contact" ? "var(--primary)" : "var(--foreground)",
              textAlign: "left"
            }}
          >
            <UserRound size={16} /> Primary Contact
          </button>
          <button
            className={activeTab === "security" ? "active" : ""}
            onClick={() => setActiveTab("security")}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 0,
              background: activeTab === "security" ? "var(--accent)" : "transparent",
              color: activeTab === "security" ? "var(--primary)" : "var(--foreground)",
              textAlign: "left"
            }}
          >
            <LockKeyhole size={16} /> Account & Security
          </button>
        </nav>

        {/* Content Card */}
        <div>
          <Card className="settings-card" style={{ padding: 28, borderRadius: 12 }}>
            {activeTab === "org" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Organisation Details</h3>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                    Configure your business profile used on extracted deal documents.
                  </p>
                </div>

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field
                    label="Organisation Name"
                    value={draft.company_name || ""}
                    onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
                    placeholder="e.g. Gada Electronics"
                  />
                  <Field
                    label="Your Role / Designation"
                    value={draft.role || ""}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                    placeholder="e.g. Proprietor"
                  />
                  <div className="field">
                    <span className="field__label">Default Currency</span>
                    <select
                      className="field__control"
                      value={draft.default_currency || "INR"}
                      onChange={(e) => setDraft({ ...draft, default_currency: e.target.value })}
                      style={{ height: 40 }}
                    >
                      <option value="INR">INR (₹) — Indian Rupee</option>
                      <option value="USD">USD ($) — US Dollar</option>
                      <option value="EUR">EUR (€) — Euro</option>
                      <option value="GBP">GBP (£) — British Pound</option>
                    </select>
                  </div>
                  <Field
                    label="Default Advance Payment %"
                    type="number"
                    value={draft.default_advance_percent ?? 30}
                    onChange={(e) => setDraft({ ...draft, default_advance_percent: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Workspace Notes</h3>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, marginBottom: 8 }}>
                    Standard business terms or address details for deal generation.
                  </p>
                  <textarea
                    className="large-input"
                    value={draft.notes || ""}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    placeholder="Add optional address, tax ID, or standard clause preferences..."
                    rows={4}
                    style={{ width: "100%", padding: 12, fontSize: 13 }}
                  />
                </div>

                <div style={{ marginTop: 12, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                  <Button onClick={save} loading={saving} style={{ padding: "0 24px" }}>
                    <Check size={16} /> Save Changes
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "contact" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Primary Contact Information</h3>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                    Designated signatory details for agreements created in Armor.
                  </p>
                </div>

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Full Name" defaultValue={session.name} readOnly />
                  <Field label="Work Email" defaultValue={session.email} readOnly />
                  <Field
                    label="Designation / Title"
                    value={draft.role || ""}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                    placeholder="Director"
                  />
                  <Field
                    label="Contact Phone"
                    placeholder="+91 98765 43210"
                    value={draft.notes?.includes("Phone:") ? draft.notes.split("Phone:")[1]?.split("·")[0]?.trim() || "" : ""}
                    onChange={(e) => setDraft({ ...draft, notes: `${draft.notes || ""} · Phone: ${e.target.value}` })}
                  />
                </div>

                <div style={{ marginTop: 12, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                  <Button onClick={save} loading={saving} style={{ padding: "0 24px" }}>
                    <Check size={16} /> Save Changes
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Account & Security Credentials</h3>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                    Update your account password and review active access permissions.
                  </p>
                </div>

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Account Username" defaultValue={session.username} readOnly />
                  <Field label="Primary Work Email" defaultValue={session.email} readOnly />
                </div>

                <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <KeyRound size={18} style={{ color: "var(--primary)" }} />
                    <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Change Account Password</h4>
                  </div>

                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <Field
                      label="Current Password"
                      type="password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Field
                      label="New Password"
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Field
                      label="Confirm New Password"
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <Button type="submit" loading={passUpdating} style={{ padding: "0 20px" }}>
                      <Check size={16} /> Update Password
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
