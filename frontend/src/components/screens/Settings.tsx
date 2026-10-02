import { useState, useEffect } from "react";
import { ArrowLeft, Building2, UserRound, LockKeyhole, Check } from "lucide-react";
import { Button, Card, Field } from "../shared/armor-ui";
import { updateProfile } from "@/lib/api";
import type { AuthUser, Profile, Screen } from "@/types/armor";

export function SettingsPage({ session, profile, setProfile, notify, go }: {
  session: AuthUser; profile: Profile | null; setProfile: (p: Profile) => void; notify: (s: string) => void; go?: (s: Screen) => void;
}) {
  const [draft, setDraft] = useState<Partial<Profile>>(profile || {});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(profile || {}); }, [profile]);

  const save = async () => {
    setSaving(true);
    try { setProfile(await updateProfile(session.username, draft)); notify("Organisation profile updated successfully."); }
    catch (e: any) { notify(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SETTINGS</span>
          <h2>Organisation Settings</h2>
          <p>These fields are stored in your Armor profile on the server.</p>
        </div>
      </div>
      {go && <button className="back-link" onClick={() => go("dashboard")}><ArrowLeft size={14} /> Back</button>}
      <div className="settings-layout">
        <nav><button className="active"><Building2 />Organisation</button><button disabled style={{ opacity: 0.4 }}><UserRound />Primary Contact</button><button disabled style={{ opacity: 0.4 }}><LockKeyhole />Account &amp; Security</button></nav>
        <div>
          <Card className="settings-card">
            <h3>Account</h3>
            <div className="form-grid">
              <Field label="Name" defaultValue={session.name} readOnly />
              <Field label="Email" defaultValue={session.email} readOnly />
            </div>
            <h3>Organisation details</h3>
            <div className="form-grid">
              <Field label="Organisation name" value={draft.company_name || ""} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} />
              <Field label="Your role" value={draft.role || ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
              <Field label="Default currency" value={draft.default_currency || "INR"} onChange={(e) => setDraft({ ...draft, default_currency: e.target.value })} />
              <Field label="Default advance %" type="number" value={draft.default_advance_percent ?? 30} onChange={(e) => setDraft({ ...draft, default_advance_percent: Number(e.target.value) })} />
            </div>
            <h3>Notes</h3>
            <textarea className="large-input" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Free-form notes about your organisation, address, industry, etc." />
            <div className="settings-actions"><Button onClick={save} loading={saving}><Check />Save Changes</Button></div>
          </Card>
        </div>
      </div>
    </>
  );
}
