import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  UserRound,
  LockKeyhole,
  Check,
} from "lucide-react";
import { Button, Card, Field } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { SettingsStarField } from "../shared/SettingsStarField";
import { updateProfile } from "@/lib/api";
import type { AuthUser, Profile, Screen } from "@/types/armor";

export function SettingsPage({
  session,
  profile,
  setProfile,
  notify,
  go,
}: {
  session: AuthUser;
  profile: Profile | null;
  setProfile: (p: Profile) => void;
  notify: (s: string) => void;
  go?: (s: Screen) => void;
}) {
  const [draft, setDraft] = useState<Partial<Profile>>(profile || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(profile || {});
  }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      setProfile(await updateProfile(session.username, draft));
      notify("Organisation profile and contract defaults updated successfully.");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-hero-workspace">
      {/* ── Calm Deep-Space 3D Star Environment ────────────────────────── */}
      <SettingsStarField hasContent={true} />

      {/* ── Foreground Content ────────────────────────────────────────── */}
      <div
        className="page-content"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 960,
          margin: "0 auto",
          padding: "36px 32px 80px",
          width: "100%",
        }}
      >
        {/* Editorial Header */}
        <EditorialHeading
          kicker="WORKSPACE PREFERENCES · CONFIGURATION"
          title="Organisation Settings"
          subtitle="Manage default contractual currencies, standard advance percentages, and organizational entity details for agreement generation."
          actions={
            go && (
              <button
                className="back-link"
                onClick={() => go("dashboard")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: 0,
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            )
          }
        />

        <div
          className="settings-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          {/* Left Sub-Nav Tabs */}
          <nav
            className="settings-nav-card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background: "rgba(10, 16, 26, 0.65)",
              backdropFilter: "blur(14px)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 8,
            }}
          >
            <button
              className="active"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                background: "rgba(47, 129, 247, 0.12)",
                color: "var(--primary)",
                border: 0,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <Building2 size={16} /> Organisation &amp; Defaults
            </button>
            <button
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--muted-foreground)",
                border: 0,
                textAlign: "left",
                opacity: 0.5,
                cursor: "not-allowed",
              }}
            >
              <UserRound size={16} /> Primary Contacts
            </button>
            <button
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--muted-foreground)",
                border: 0,
                textAlign: "left",
                opacity: 0.5,
                cursor: "not-allowed",
              }}
            >
              <LockKeyhole size={16} /> Account Security
            </button>
          </nav>

          {/* Right Settings Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card
              className="settings-form-card"
              style={{
                padding: 28,
                borderRadius: 16,
                background: "rgba(10, 16, 26, 0.65)",
                backdropFilter: "blur(14px)",
                border: "1px solid var(--border)",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {/* Account Credentials */}
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                  User Identity &amp; Auth Credentials
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 14px" }}>
                  Your personal account credentials linked to the Armor workspace.
                </p>
                <div
                  className="form-grid"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
                >
                  <Field label="Full Name" defaultValue={session.name} readOnly />
                  <Field label="Account Email" defaultValue={session.email} readOnly />
                </div>
              </div>

              <hr style={{ border: 0, height: 1, background: "var(--border)", margin: 0 }} />

              {/* Organisation & Defaults */}
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                  Commercial Agreement Defaults
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 14px" }}>
                  These values auto-populate into newly generated commercial agreement drafts.
                </p>
                <div
                  className="form-grid"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
                >
                  <Field
                    label="Organisation Legal Entity Name"
                    value={draft.company_name || ""}
                    onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
                    placeholder="e.g. Acme Technologies Private Limited"
                  />
                  <Field
                    label="Your Title / Role"
                    value={draft.role || ""}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                    placeholder="e.g. Head of Commercial Procurement"
                  />
                  <Field
                    label="Default Transaction Currency"
                    value={draft.default_currency || "INR"}
                    onChange={(e) => setDraft({ ...draft, default_currency: e.target.value })}
                    placeholder="INR, USD, EUR, GBP"
                  />
                  <Field
                    label="Default Advance Payment (%)"
                    type="number"
                    value={draft.default_advance_percent ?? 30}
                    onChange={(e) =>
                      setDraft({ ...draft, default_advance_percent: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <hr style={{ border: 0, height: 1, background: "var(--border)", margin: 0 }} />

              {/* Entity Notes */}
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                  Entity Profile &amp; Incorporation Notes
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 12px" }}>
                  Information regarding registered address, industry, or corporate tax registrations.
                </p>
                <textarea
                  className="large-input"
                  rows={3}
                  value={draft.notes || ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Registered Address, GSTIN / VAT, Industry details, corporate standard riders..."
                  style={{
                    width: "100%",
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--navy-soft)",
                    color: "var(--foreground)",
                    padding: 12,
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Button
                  onClick={save}
                  loading={saving}
                  style={{ height: 42, padding: "0 22px", fontSize: 13 }}
                >
                  <Check size={16} /> Save Settings
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
