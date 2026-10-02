import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Send, Sparkles, LockKeyhole, ShieldCheck, RefreshCcw, Copy, Mail } from "lucide-react";
import { Button, Card, Field, IconButton, Modal, StatusBadge } from "../shared/armor-ui";
import { shareDeal, regenerateEmail } from "@/lib/api";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDateTime } from "@/lib/format";
import type { DealRecord, ExtractedDeal } from "@/types/armor";

function DocumentPreview({ title, extracted, notes, buyer, seller, dealId }: {
  title: string; extracted: ExtractedDeal; notes: string; buyer: string; seller: string; dealId: string;
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
        <footer>Generated from a verified business conversation. This record is not represented as a legally binding electronic signature.</footer>
      </article>
    </aside>
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

import type { Screen } from "@/types/armor";

export function Agreement({ deal, setDeal, go, notify }: { deal: DealRecord; setDeal: (d: DealRecord) => void; go: (s: Screen) => void; notify: (s: string) => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ARMOR DEAL AGREEMENT</span>
          <h2>{deal.deal_name}</h2>
          <p>Deal ID {deal.id} · Created {formatDateTime(deal.created_at)}</p>
        </div>
        <StatusBadge status={dealBadge(deal)} />
      </div>
      <button className="back-link" onClick={() => go("deal")}><ArrowLeft size={14} /> Back</button>
      <div className="agreement-layout">
        <div><DocumentPreview title={deal.deal_name} extracted={extracted} notes={(extracted.conditions || []).join(" ")} buyer={buyer} seller={seller} dealId={deal.id} /></div>
        <aside>
          <Card className="confirmation-card">
            <h3>Share this agreement</h3>
            <div><span className="party-icon"><Building2 /></span><p><b>{seller}</b><span>Counterparty {deal.confirmation_status !== "draft" && `· ${dealBadge(deal)}`}</span></p></div>
            <Button onClick={() => setShareOpen(true)}><Send />Share Agreement</Button>
            <Button variant="secondary" onClick={() => go("counterparty")}><ArrowRight />Open Confirmation View</Button>
          </Card>
          {deal.agreement?.summary && (
            <Card className="secure-note">
              <Sparkles />
              <div><b>AI summary from initial analysis</b><p>{deal.agreement.summary}</p></div>
            </Card>
          )}
          <Card className="secure-note"><LockKeyhole /><div><b>About sharing</b><p>If the server has SMTP configured, "Share Agreement" emails the counterparty directly. Otherwise it still records the deal as shared and falls back to opening your own mail client.</p></div></Card>
        </aside>
      </div>
      {shareOpen && <ShareModal deal={deal} onClose={() => setShareOpen(false)} notify={notify} onShared={setDeal} />}
    </>
  );
}
