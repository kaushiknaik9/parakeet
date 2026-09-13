import React, { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail, RefreshCcw } from "lucide-react";
import { regenerateEmail } from "../api/dealapi";

const DealEmail = ({ dealId, email, extracted, agreement, onEmailUpdated }) => {
  const [subject, setSubject] = useState(email?.subject || "");
  const [body, setBody] = useState(email?.body || "");
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState(null);

  useEffect(() => {
    setSubject(email?.subject || "");
    setBody(email?.body || "");
  }, [email]);

  const copy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openMail = () => {
    const to = extracted?.parties?.[1]?.name || "";
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  const handleRegenerate = async () => {
    if (!dealId) return;
    setIsRegenerating(true);
    setRegenError(null);
    try {
      const updated = await regenerateEmail(dealId, extracted, agreement);
      onEmailUpdated?.(updated);
    } catch (err) {
      setRegenError(err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-7 min-w-0 flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Mail size={18} className="opacity-60 text-[var(--text-main)]" />
          <h3 className="font-semibold text-[var(--text-main)]">Deal Confirmation Email</h3>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          title="Regenerate email from the current terms"
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)] opacity-70 hover:opacity-100 transition-opacity disabled:opacity-30"
        >
          {isRegenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
          Regenerate
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {regenError && <p className="text-xs text-red-500">{regenError}</p>}
        <div>
          <label className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-2 block">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm font-semibold text-[var(--text-main)] focus:outline-none focus:border-[var(--text-main)]/30"
          />
        </div>

        <div className="flex-1 flex flex-col">
          <label className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-2 block">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full flex-1 min-h-[220px] bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-2xl p-4 text-sm text-[var(--text-main)] leading-relaxed focus:outline-none focus:border-[var(--text-main)]/30 resize-y font-mono"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-base)]/10 transition-colors text-sm font-medium"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={openMail}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-bold text-sm transition-all"
          >
            <Mail size={16} />
            Open in Mail
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealEmail;
