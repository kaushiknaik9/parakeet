import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Building2, Send, Sparkles, LockKeyhole, ShieldCheck, RefreshCcw, Copy, Mail, FileCheck, CheckCircle, AlertCircle } from "lucide-react";
import { Button, Card, Field, IconButton, Modal, StatusBadge } from "../shared/armor-ui";
import { shareDeal, regenerateEmail, requestSignature, getDeal } from "@/lib/api";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDateTime } from "@/lib/format";
import type { DealRecord, ExtractedDeal, Screen } from "@/types/armor";

function DocumentPreview({ title, extracted, notes, buyer, seller, dealId, signedAt, signerEmail }: {
  title: string; extracted: ExtractedDeal; notes: string; buyer: string; seller: string; dealId: string; signedAt?: string | null | undefined; signerEmail?: string | null | undefined;
}) {
  return (
    <aside className="document-wrap">
      <div className="document-label">LIVE AGREEMENT PREVIEW <span>DEAL {dealId.toUpperCase()}</span></div>
      <article className="document">
        <div className="document__brand"><span className="brand__mark"><ShieldCheck /></span>ARMOR</div>
        <span className="document__kicker">DEAL AGREEMENT · {dealId.toUpperCase()}</span>
        <h2>{title}</h2>
        <p>This deal record documents the commercial terms confirmed by both parties following their business conversation.</p>
        <hr />
        <h4>1. Parties</h4>
        <p><b>Buyer:</b> {buyer}<br /><b>Seller:</b> {seller}</p>
        <h4>2. Financial terms</h4>
        <div className="document-total"><span>Total deal value</span><b>{extracted.total_value || "—"}</b></div>
        <p>{extracted.payment_terms || "Payment terms not specified."}</p>
        <h4>3. Delivery</h4>
        <p>{extracted.quantity ? `${extracted.quantity} of ${extracted.product_or_service}. ` : ""}{extracted.delivery_terms || "Delivery terms not specified."}</p>
        <h4>4. Additional notes</h4>
        <p>{notes || "None."}</p>
        {signedAt && (
          <div style={{ marginTop: 20, padding: 12, background: "rgba(35, 134, 54, 0.12)", border: "1px solid rgba(35, 134, 54, 0.3)", borderRadius: 6, fontSize: 12, color: "var(--success-text)" }}>
            <b>✓ Electronic Signature Accepted</b>
            <p style={{ margin: "2px 0 0", fontSize: 11 }}>Signed by {signerEmail || "Counterparty"} on {formatDateTime(signedAt)}</p>
          </div>
        )}
        <footer>Generated from a verified business conversation. Managed via Armor Local E-Signature workflow.</footer>
      </article>
    </aside>
  );
}

function ESignModal({ deal, onClose, notify, onSent }: {
  deal: DealRecord; onClose: () => void; notify: (s: string) => void; onSent: (d: DealRecord) => void;
}) {
  const [counterpartyEmail, setCounterpartyEmail] = useState(deal.counterparty_email || "");
  const [subject, setSubject] = useState(deal.email?.subject || `Action Required: E-Sign Agreement for ${deal.deal_name}`);
  const [body, setBody] = useState(deal.email?.body || `Please review and e-sign the commercial terms for ${deal.deal_name}.`);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<DealRecord | null>(null);

  const handleSend = async () => {
    setSending(true);
    try {
      const updated = await requestSignature(deal.id, counterpartyEmail, subject, body);
      onSent(updated);
      setResult(updated);
      notify("E-signature request dispatched to " + (counterpartyEmail || "counterparty"));
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Send for E-Signature via Email" description="Dispatches a secure local action link to the counterparty. When clicked, Armor updates in real-time." onClose={onClose}>
      {!result ? (
        <>
          <Field label="Counterparty Email" type="email" value={counterpartyEmail} onChange={(e) => setCounterpartyEmail(e.target.value)} placeholder="counterparty@company.com" />
          <Field label="Email Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div className="email-preview">
            <span>MESSAGE BODY</span>
            <textarea className="large-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 120 }} />
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSend} loading={sending} disabled={!counterpartyEmail}><Send size={15} />Send E-Signature Request</Button>
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--success-text)", fontWeight: 600 }}>E-Signature request active for deal #{deal.id}!</p>
          <div style={{ background: "var(--secondary)", border: "1px solid var(--border)", padding: 12, borderRadius: 8, fontSize: 12 }}>
            <b style={{ display: "block", marginBottom: 6, color: "var(--foreground)" }}>Local Confirmation Action Links:</b>
            <p style={{ margin: "4px 0", wordBreak: "break-all" }}><b>Accept: </b><a href={result.accept_url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>{result.accept_url}</a></p>
            <p style={{ margin: "4px 0", wordBreak: "break-all" }}><b>Decline: </b><a href={result.decline_url} target="_blank" rel="noreferrer" style={{ color: "var(--danger-text)" }}>{result.decline_url}</a></p>
          </div>
          <div className="modal-actions">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ShareModal({ deal, onClose, notify, onShared }: {
  deal: DealRecord; onClose: () => void; notify: (s: string) => void; onShared: (d: DealRecord) => void;
}) {
  const [subject, setSubject] = useState(deal.email?.subject || `Deal Agreement — ${deal.id}`);
  const [body, setBody] = useState(deal.email?.body || "");
  const [counterpartyEmail, setCounterpartyEmail] = useState(deal.counterparty_email || "");
  const [regenerating, setRegenerating] = useState(false);
  const [sharing, setSharing] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const updated = await regenerateEmail(deal.id, deal.extracted, deal.agreement);
      setSubject(updated.email.subject); setBody(updated.email.body);
    } catch (e: any) { notify(e.message); }
    finally { setRegenerating(false); }
  };

  const copy = () => { navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); notify("Copied to clipboard."); };
  const openMail = () => { window.location.href = `mailto:${encodeURIComponent(counterpartyEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; };

  const share = async () => {
    setSharing(true);
    try {
      const updated = await shareDeal(deal.id, { counterparty_email: counterpartyEmail, subject, body });
      onShared(updated);
      if (updated.email_sent) {
        notify(`Emailed to ${counterpartyEmail}.`);
        onClose();
      } else {
        notify(updated.email_send_note || "Marked as shared — no SMTP configured, so it wasn't emailed automatically.");
      }
    } catch (e: any) { notify(e.message); }
    finally { setSharing(false); }
  };

  return (
    <Modal title="Share Agreement" description="Records this deal as sent for confirmation. Emails the counterparty directly if the server has SMTP configured — otherwise use Open in Mail / Copy below." onClose={onClose}>
      <Field label="Counterparty email" type="email" value={counterpartyEmail} onChange={(e) => setCounterpartyEmail(e.target.value)} placeholder="counterparty@company.com" />
      <Field label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <div className="email-preview"><span>EMAIL PREVIEW</span><textarea className="large-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 160 }} /></div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={regenerate} disabled={regenerating}><RefreshCcw size={16} className={regenerating ? "animate-spin" : ""} />Regenerate</Button>
        <Button variant="secondary" onClick={copy}><Copy size={16} />Copy</Button>
        <Button variant="secondary" onClick={openMail} disabled={!counterpartyEmail}><Mail size={16} />Open in Mail</Button>
        <Button onClick={share} loading={sharing} disabled={!counterpartyEmail}><Send size={16} />Share Agreement</Button>
      </div>
    </Modal>
  );
}

export function Agreement({ deal, setDeal, go, notify }: { deal: DealRecord; setDeal: (d: DealRecord) => void; go: (s: Screen) => void; notify: (s: string) => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [esignOpen, setEsignOpen] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  // Real-time polling while awaiting signature or counterparty
  useEffect(() => {
    const isAwaiting = deal.signature_status === "awaiting_signature" || deal.confirmation_status === "awaiting_counterparty";
    if (!isAwaiting) return;

    const timer = setInterval(async () => {
      try {
        const fresh = await getDeal(deal.id);
        if (
          fresh.signature_status !== deal.signature_status ||
          fresh.confirmation_status !== deal.confirmation_status
        ) {
          setDeal(fresh);
          if (fresh.signature_status === "signed") {
            notify("🎉 Deal signed and legally accepted by counterparty!");
          } else if (fresh.signature_status === "declined") {
            notify("⚠️ Counterparty rejected the signature request.");
          }
        }
      } catch {
        // ignore network error during polling
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [deal.id, deal.signature_status, deal.confirmation_status, setDeal, notify]);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ARMOR DEAL AGREEMENT</span>
          <h2>{deal.deal_name}</h2>
          <p>Deal ID {deal.id} · Created {formatDateTime(deal.created_at)}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <StatusBadge status={dealBadge(deal)} />
          {deal.signature_status === "signed" && deal.signed_at && (
            <small style={{ fontSize: 11, color: "var(--success-text)", fontFamily: "var(--font-mono)" }}>
              Signed: {formatDateTime(deal.signed_at)}
            </small>
          )}
        </div>
      </div>
      <button className="back-link" onClick={() => go("deal")}><ArrowLeft size={14} /> Back</button>
      <div className="agreement-layout">
        <div className="w-full">
          <DocumentPreview title={deal.deal_name} extracted={extracted} notes={(extracted.conditions || []).join(" ")} buyer={buyer} seller={seller} dealId={deal.id} signedAt={deal.signed_at} signerEmail={deal.signer_email} />
        </div>
        <aside className="flex flex-col gap-4">
          <Card className="confirmation-card">
            <h3 className="text-base font-bold text-foreground">E-Signature & Sharing</h3>
            <div className="flex items-center gap-3 my-3">
              <span className="party-icon">
                <Building2 size={18} />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <b className="text-sm font-bold truncate text-foreground">{seller}</b>
                <span className="text-xs text-muted-foreground truncate">
                  Counterparty · <StatusBadge status={dealBadge(deal)} />
                </span>
              </div>
            </div>

            {deal.signature_status === "signed" && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: "rgba(35, 134, 54, 0.12)", border: "1px solid rgba(35, 134, 54, 0.3)" }}>
                <b style={{ fontSize: 12, color: "var(--success-text)" }}>Signed & Legally Accepted</b>
                <p style={{ fontSize: 11, margin: "2px 0 0", color: "var(--muted-foreground)" }}>Signed at: {formatDateTime(deal.signed_at)}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Button onClick={() => setEsignOpen(true)}>
                <FileCheck size={15} />Send for E-Signature via Email
              </Button>
              <Button variant="secondary" onClick={() => setShareOpen(true)}>
                <Send size={15} />Share Agreement Draft
              </Button>
              <Button variant="secondary" onClick={() => go("counterparty")}>
                <ArrowRight size={15} />Open Confirmation View
              </Button>
            </div>
          </Card>
          {deal.agreement?.summary && (
            <Card className="secure-note">
              <Sparkles />
              <div><b className="text-xs font-bold block mb-0.5">AI summary from initial analysis</b><p className="text-xs leading-relaxed opacity-90">{deal.agreement.summary}</p></div>
            </Card>
          )}
          <Card className="secure-note">
            <LockKeyhole />
            <div><b className="text-xs font-bold block mb-0.5">Local E-Signature Workflow</b><p className="text-xs leading-relaxed opacity-90">Send for E-Signature dispatches a secure link. When the counterparty clicks Accept, Armor polls and updates this UI instantly without third-party services.</p></div>
          </Card>
        </aside>
      </div>
      {shareOpen && <ShareModal deal={deal} onClose={() => setShareOpen(false)} notify={notify} onShared={setDeal} />}
      {esignOpen && <ESignModal deal={deal} onClose={() => setEsignOpen(false)} notify={notify} onSent={setDeal} />}
    </>
  );
}
