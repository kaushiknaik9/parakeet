import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Send,
  Sparkles,
  LockKeyhole,
  ShieldCheck,
  RefreshCcw,
  Copy,
  Mail,
  FileCheck2,
} from "lucide-react";
import { Button, Card, Field, IconButton, Modal, StatusBadge } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { StockWarningsBanner } from "../shared/StockWarningsBanner";
import { ESignModal } from "../shared/ESignModal";
import { AgreementPreview } from "../agreement/AgreementPreview";
import { shareDeal, regenerateEmail } from "@/lib/api";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDateTime } from "@/lib/format";
import type { DealRecord, ExtractedDeal, Screen } from "@/types/armor";

function DocumentPreview({
  title,
  extracted,
  notes,
  buyer,
  seller,
  dealId,
  agreementDoc,
}: {
  title: string;
  extracted: ExtractedDeal;
  notes: string;
  buyer: string;
  seller: string;
  dealId: string;
  agreementDoc?: any;
}) {
  return (
    <article
      className="document"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "44px 38px",
        boxShadow: "var(--shadow)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Official Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/LOGO_Fair.png"
            alt="Armor"
            style={{ width: 28, height: 28, objectFit: "contain" }}
          />
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.05em", fontFamily: "var(--font-display)" }}>
              ARMOR COMMERCIAL AGREEMENT
            </span>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
              RECORD NO. ARMOR-{dealId.toUpperCase()}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: 4,
            background: "rgba(35, 134, 54, 0.1)",
            color: "var(--success-text)",
            border: "1px solid rgba(35, 134, 54, 0.3)",
          }}
        >
          CONFIRMED RECORD
        </span>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 28,
          fontWeight: 400,
          margin: "4px 0 0",
          lineHeight: 1.2,
          color: "var(--foreground)",
        }}
      >
        {title}
      </h1>

      <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
        {agreementDoc?.summary ||
          "This binding commercial agreement formalizes the transaction parameters mutually agreed between the principal buyer and vendor entities following conversation verification."}
      </p>

      <hr style={{ border: 0, height: 1, background: "var(--border)", margin: "4px 0" }} />

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--primary)", textTransform: "uppercase", margin: "0 0 6px" }}>
            Section 1. Commercial Parties
          </h4>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            This Agreement is entered into between <b>{buyer}</b> ("Buyer") and <b>{seller}</b> ("Seller / Vendor").
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--primary)", textTransform: "uppercase", margin: "0 0 6px" }}>
            Section 2. Scope &amp; Deliverables
          </h4>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            The Seller agrees to supply and deliver <b>{extracted.quantity || "the agreed quantity"}</b> of{" "}
            <b>{extracted.product_or_service || "the designated goods/services"}</b> subject to the terms and specifications agreed herein.
          </p>
          {extracted.delivery_terms && (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
              <b>Delivery Terms:</b> {extracted.delivery_terms}
            </p>
          )}
        </div>

        <div>
          <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--primary)", textTransform: "uppercase", margin: "0 0 6px" }}>
            Section 3. Total Valuation &amp; Payment Schedule
          </h4>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--navy-soft)",
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              margin: "6px 0",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Total Consideration:</span>
            <b style={{ fontSize: 16, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
              {extracted.total_value || "—"}
            </b>
          </div>
          <p style={{ fontSize: 12, margin: "6px 0 0", color: "var(--foreground)" }}>
            <b>Terms:</b> {extracted.payment_terms || "As scheduled."}{" "}
            {extracted.advance_percent != null && `(${extracted.advance_percent}% advance required).`}
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--primary)", textTransform: "uppercase", margin: "0 0 6px" }}>
            Section 4. Conditions &amp; Liquidated Terms
          </h4>
          <p style={{ fontSize: 12, margin: 0, color: "var(--muted-foreground)", fontStyle: "italic", lineHeight: 1.5 }}>
            {notes || "Standard commercial warranty, inspection on delivery, and confidentiality clauses apply without exclusion."}
          </p>
        </div>
      </div>

      {/* Signature Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginTop: 20,
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ borderBottom: "1px dashed var(--border-strong)", height: 32, marginBottom: 6 }} />
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Authorized Signature for {buyer}</span>
        </div>
        <div>
          <div style={{ borderBottom: "1px dashed var(--border-strong)", height: 32, marginBottom: 6 }} />
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Authorized Signature for {seller}</span>
        </div>
      </div>

      <footer
        style={{
          fontSize: 10,
          color: "var(--muted-foreground)",
          borderTop: "1px solid var(--border)",
          paddingTop: 12,
          marginTop: 10,
          lineHeight: 1.4,
        }}
      >
        Verified by ARMOR Deal Intelligence. Generated from audited commercial discussions.
      </footer>
    </article>
  );
}

function ShareModal({
  deal,
  onClose,
  notify,
  onShared,
}: {
  deal: DealRecord;
  onClose: () => void;
  notify: (s: string) => void;
  onShared: (d: DealRecord) => void;
}) {
  const [subject, setSubject] = useState(
    deal.email?.subject || `Commercial Agreement — ${deal.id}`
  );
  const [body, setBody] = useState(deal.email?.body || "");
  const [counterpartyEmail, setCounterpartyEmail] = useState(
    deal.counterparty_email || ""
  );
  const [regenerating, setRegenerating] = useState(false);
  const [sharing, setSharing] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const updated = await regenerateEmail(deal.id, deal.extracted, deal.agreement);
      setSubject(updated.email.subject);
      setBody(updated.email.body);
    } catch (e: any) {
      notify(e.message);
    } finally {
      setRegenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    notify("Copied to clipboard.");
  };

  const openMail = () => {
    window.location.href = `mailto:${encodeURIComponent(counterpartyEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const share = async () => {
    setSharing(true);
    try {
      const updated = await shareDeal(deal.id, {
        counterparty_email: counterpartyEmail,
        subject,
        body,
      });
      onShared(updated);
      if (updated.email_sent) {
        notify(`Agreement emailed directly to ${counterpartyEmail}.`);
        onClose();
      } else {
        notify(
          updated.email_send_note ||
            "Recorded as shared — no SMTP configured, falling back to mail client."
        );
      }
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      title="Share Commercial Agreement"
      description="Transmits the formal confirmation document to your counterparty. When SMTP is configured, this sends directly from your server."
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
        <Field
          label="Counterparty Recipient Email"
          type="email"
          value={counterpartyEmail}
          onChange={(e) => setCounterpartyEmail(e.target.value)}
          placeholder="procurement@counterparty.com"
        />
        <Field
          label="Email Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <div>
          <label className="field__label" style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>
            TRANSMISSION BODY
          </label>
          <textarea
            className="large-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ minHeight: 180, width: "100%", fontSize: 12, borderRadius: 8, padding: 10 }}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button
            variant="secondary"
            onClick={regenerate}
            disabled={regenerating}
            style={{ fontSize: 12 }}
          >
            <RefreshCcw size={14} className={regenerating ? "animate-spin" : ""} />
            Regenerate Email
          </Button>
          <Button variant="secondary" onClick={copy} style={{ fontSize: 12 }}>
            <Copy size={14} /> Copy Body
          </Button>
          <Button
            variant="secondary"
            onClick={openMail}
            disabled={!counterpartyEmail}
            style={{ fontSize: 12 }}
          >
            <Mail size={14} /> Open in Mail App
          </Button>
          <Button
            onClick={share}
            loading={sharing}
            disabled={!counterpartyEmail}
            style={{ fontSize: 12, padding: "0 18px" }}
          >
            <Send size={14} /> Send Agreement
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function Agreement({
  deal,
  setDeal,
  go,
  notify,
}: {
  deal: DealRecord;
  setDeal: (d: DealRecord) => void;
  go: (s: Screen) => void;
  notify: (s: string) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [esignOpen, setEsignOpen] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Editorial Header */}
      <EditorialHeading
        kicker="FORMAL AGREEMENT · STEP 05"
        title={deal.deal_name}
        subtitle={`Agreement Record ARMOR-${deal.id.toUpperCase()} · Finalized on ${formatDateTime(deal.created_at)}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="back-link"
              onClick={() => go("deal")}
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
              <ArrowLeft size={14} /> Back to Deal
            </button>
            <Button
              variant="secondary"
              onClick={() => setEsignOpen(true)}
              style={{ height: 40, padding: "0 16px", fontSize: 13 }}
            >
              <Send size={15} /> E-Sign Dispatch
            </Button>
            <Button
              onClick={() => setShareOpen(true)}
              style={{ height: 40, padding: "0 18px", fontSize: 13 }}
            >
              <Send size={15} /> Share Agreement
            </Button>
          </div>
        }
      />

      {/* Warehouse Stock Warning Alerts */}
      <StockWarningsBanner warnings={extracted.stock_warnings} stockStatus={extracted.stock_status} />

      {/* Main Split: Left Document Preview, Right Confirmation Control Panel */}
      <div
        className="agreement-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left: Document View */}
        <div>
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

        {/* Right: Deal Controls & Transmission Panel */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            style={{
              padding: 22,
              borderRadius: 16,
              background: "var(--card)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase" }}>
                TRANSMISSION STATUS
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "2px 0 8px" }}>
                Share with Counterparty
              </h3>
              <StatusBadge status={dealBadge(deal)} />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--navy-soft)",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              <Building2 size={20} className="text-primary" />
              <div>
                <b style={{ fontSize: 13, display: "block" }}>{seller}</b>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  {deal.counterparty_email || "No email on file"}
                </span>
              </div>
            </div>

            <Button
              onClick={() => setEsignOpen(true)}
              style={{ width: "100%", justifyContent: "center", height: 40, fontSize: 13 }}
            >
              <Send size={15} /> Dispatch for E-Signature
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShareOpen(true)}
              style={{ width: "100%", justifyContent: "center", height: 38, fontSize: 12 }}
            >
              <Send size={14} /> Transmit Email Copy
            </Button>
          </Card>

          {deal.agreement?.summary && (
            <Card
              style={{
                padding: 18,
                borderRadius: 14,
                background: "var(--card)",
                border: "1px solid var(--border)",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Sparkles size={18} className="text-primary" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <b style={{ fontSize: 12, display: "block", marginBottom: 4 }}>AI Contract Executive Summary</b>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
                  {deal.agreement.summary}
                </p>
              </div>
            </Card>
          )}

          <Card
            style={{
              padding: 16,
              borderRadius: 14,
              background: "var(--navy-soft)",
              border: "1px solid var(--border)",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <LockKeyhole size={18} className="text-primary" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <b style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Secure Transmission Audit</b>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
                Every transmission event is permanently logged to the immutable deal ledger for audit compliance.
              </p>
            </div>
          </Card>
        </aside>
      </div>

      {shareOpen && (
        <ShareModal
          deal={deal}
          onClose={() => setShareOpen(false)}
          notify={notify}
          onShared={setDeal}
        />
      )}

      {esignOpen && (
        <ESignModal
          deal={deal}
          onClose={() => setEsignOpen(false)}
          notify={notify}
          onSent={setDeal}
        />
      )}
    </div>
  );
}
