import { useState } from "react";
import { Send, CheckCircle, ShieldCheck, Mail, AlertCircle } from "lucide-react";
import { Button, Field, Modal } from "./armor-ui";
import { requestSignature } from "@/lib/api";
import type { DealRecord } from "@/types/armor";

interface ESignModalProps {
  deal: DealRecord;
  onClose: () => void;
  notify: (msg: string) => void;
  onSent: (updatedDeal: DealRecord) => void;
}

export function ESignModal({ deal, onClose, notify, onSent }: ESignModalProps) {
  const [counterpartyEmail, setCounterpartyEmail] = useState(deal.counterparty_email || "kaushiknaik2907@gmail.com");
  const [subject, setSubject] = useState(deal.email?.subject || `Action Required: E-Sign Agreement for ${deal.deal_name}`);
  const [body, setBody] = useState(deal.email?.body || `Please review and e-sign the commercial terms for ${deal.deal_name}.`);
  const [provider, setProvider] = useState<"in_house" | "docuseal">("docuseal");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DealRecord | null>(null);

  const handleSend = async () => {
    if (!counterpartyEmail || !counterpartyEmail.includes("@")) {
      setError("No valid recipient email address configured for this deal. Please enter a valid email below.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const updated = await requestSignature(deal.id, counterpartyEmail, subject, body, provider);
      onSent(updated);
      setResult(updated);
      const provName = updated.email_provider === "docuseal" ? "DocuSeal Turnkey" : "Armor Direct Mail";
      notify(`E-signature request dispatched via ${provName} to ${counterpartyEmail}`);
    } catch (e: any) {
      const msg = e.message || "Failed to dispatch signature request";
      setError(msg);
      notify(msg);
    } finally {
      setSending(false);
    }
  };

  const selectedProviderLabel =
    result?.email_provider === "docuseal" || provider === "docuseal"
      ? "DocuSeal Turnkey Signatures"
      : "Armor Direct Mail (In-House SMTP)";

  return (
    <Modal
      title="Send for E-Signature via Email"
      description="Dispatches a secure commercial agreement package with attached PDF. Choose between Armor Direct Mail or DocuSeal Turnkey Signatures."
      onClose={onClose}
    >
      {!result ? (
        <>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Field
            label="Counterparty Email"
            type="email"
            value={counterpartyEmail}
            onChange={(e) => { setCounterpartyEmail(e.target.value); setError(null); }}
            placeholder="counterparty@company.com"
          />

          <Field label="Email Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />

          <div className="my-3 space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              Dispatch Engine Architecture
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider("in_house")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  provider === "in_house"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <Mail size={18} className="shrink-0 mt-0.5" />
                <div>
                  <b className="text-xs font-bold block text-foreground">Armor Direct Mail</b>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">In-House SMTP &amp; PDF Attachment</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider("docuseal")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  provider === "docuseal"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <Send size={18} className="shrink-0 mt-0.5" />
                <div>
                  <b className="text-xs font-bold block text-foreground">DocuSeal Turnkey</b>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Interactive Turnkey Signatures</span>
                </div>
              </button>
            </div>
          </div>

          <div className="email-preview">
            <span>MESSAGE BODY</span>
            <textarea
              className="large-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ minHeight: 100 }}
            />
          </div>

          <div className="modal-actions mt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} loading={sending} disabled={!counterpartyEmail}>
              <Send size={15} /> Dispatch Signature Request
            </Button>
          </div>
        </>
      ) : (
        <div className="p-4 space-y-4 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Signature Package Dispatched!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Dispatched via <b>{selectedProviderLabel}</b> to <b>{counterpartyEmail}</b>.
            </p>
          </div>
          <Button className="w-full justify-center" onClick={onClose}>
            Return to Agreement Screen
          </Button>
        </div>
      )}
    </Modal>
  );
}
