import React, { useEffect, useState } from "react";

import { getProfile, updateProfile } from "../api/dealapi";

const fields = [
  { key: "company_name", label: "Company / Organization" },
  { key: "role", label: "Your Role" },
  { key: "default_currency", label: "Default Currency" },
  { key: "default_advance_percent", label: "Default Advance %" },
  { key: "notes", label: "Notes" },
];

const UserProfile = ({ username }) => {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getProfile(username);
        setProfile(data);
        setDraft(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [username]);

  const save = async () => {
    try {
      const updated = await updateProfile(username, draft);
      setProfile(updated);
      setDraft(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in zoom-in duration-500">
      <h2 className="text-3xl font-bold text-[var(--text-main)] mb-8">
        Business Profile
      </h2>
      <div className="glass-panel rounded-3xl p-6 md:p-8">
        {isLoading && (
          <p className="text-sm text-[var(--text-muted)]">Loading profile...</p>
        )}
        {!isLoading && error && <p className="text-sm text-red-500">{error}</p>}

        {!isLoading && !error && (
          <div className="space-y-5">
            {fields.map((field) => (
              <div key={field.key}>
                <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-2">
                  {field.label}
                </p>
                {isEditing ? (
                  <textarea
                    value={draft[field.key] || ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                    }
                    className="w-full min-h-[72px] bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:outline-none"
                  />
                ) : (
                  <div className="w-full bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-2xl p-4 text-sm text-[var(--text-main)] min-h-[72px]">
                    {profile?.[field.key] || "—"}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDraft(profile || {});
                    }}
                    className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    className="px-4 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-bold"
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-bold"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
