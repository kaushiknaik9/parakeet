import { useState, useEffect } from "react";
import { shareDeal, regenerateEmail, getDeal } from "@/lib/api";
import { partyLabel } from "../features/DealHelpers";
import type { DealRecord, Screen } from "@/types/armor";
import { StockWarningsBanner } from "../shared/StockWarningsBanner";
import { ESignModal } from "../shared/ESignModal";
import { AgreementHeader } from "../agreement/AgreementHeader";
import { AgreementPreview } from "../agreement/AgreementPreview";
import { SignActionSidebar } from "../agreement/SignActionSidebar";
import { Modal, Field, Button } from "../shared/armor-ui";
import { RefreshCcw, Copy, Mail, Send } from "lucide-react";

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
        notify(updated.email_send_note || "Marked as shared — no SMTP configured.");
      }
    } catch (e: any) { notify(e.message); }
    finally { setSharing(false); }
  };

  return (
    <Modal title="Share Agreement" description="Records this deal as sent for confirmation." onClose={onClose}>
      <Field label="Counterparty email" type="email" value={counterpartyEmail} onChange={(e) => setCounterpartyEmail(e.target.value)} placeholder="counterparty@company.com" />
      <Field label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <div className="email-preview"><span>EMAIL PREVIEW</span><textarea className="large-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 140 }} /></div>
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
      <AgreementHeader deal={deal} go={go} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <StockWarningsBanner warnings={extracted.stock_warnings} stockStatus={extracted.stock_status} />
          <AgreementPreview
            title={deal.deal_name}
            extracted={extracted}
            notes={(extracted.conditions || []).join(" ")}
            buyer={buyer}
            seller={seller}
            dealId={deal.id}
            signedAt={deal.signed_at}
            signerEmail={deal.signer_email}
          />
        </div>
        <div className="lg:col-span-1">
          <SignActionSidebar
            deal={deal}
            seller={seller}
            onOpenEsign={() => setEsignOpen(true)}
            notify={notify}
          />
        </div>
      </div>
      {shareOpen && <ShareModal deal={deal} onClose={() => setShareOpen(false)} notify={notify} onShared={setDeal} />}
      {esignOpen && <ESignModal deal={deal} onClose={() => setEsignOpen(false)} notify={notify} onSent={setDeal} />}
    </>
  );
}
