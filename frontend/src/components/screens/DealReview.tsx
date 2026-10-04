import { useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  RefreshCcw,
  ShieldCheck,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { Button, Card, Field } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { updateDeal, regenerateEmail } from "@/lib/api";
import { partyLabel } from "../features/DealHelpers";
import type { DealRecord, ExtractedDeal, AuthUser, Screen } from "@/types/armor";

function DocumentPreview({
  title,
  extracted,
  notes,
  buyer,
  seller,
  dealId,
}: {
  title: string;
  extracted: ExtractedDeal;
  notes: string;
  buyer: string;
  seller: string;
  dealId: string;
}) {
  return (
    <aside
      className="document-wrap"
      style={{
        position: "sticky",
        top: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span>LIVE CONTRACT PREVIEW</span>
        <span style={{ color: "var(--primary)", fontWeight: 700 }}>DEAL {dealId.toUpperCase()}</span>
      </div>

      <article
        className="document"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "32px 28px",
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
          <img
            src="/LOGO_Fair.png"
            alt="Armor"
            style={{ width: 22, height: 22, objectFit: "contain" }}
          />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", fontFamily: "var(--font-display)" }}>
            ARMOR COMMERCIAL AGREEMENT
          </span>
        </div>

        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          CONFIRMED TERMS · {dealId.toUpperCase()}
        </span>

        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, margin: 0, lineHeight: 1.2 }}>
          {title}
        </h2>

        <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
          This agreement formalizes the commercial parameters confirmed between both parties following their business negotiation.
        </p>

        <hr style={{ border: 0, height: 1, background: "var(--border)", margin: "4px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", margin: "0 0 4px" }}>
              1. Commercial Parties
            </h4>
            <p style={{ fontSize: 12, margin: 0 }}>
              <b>Buyer:</b> {buyer} &nbsp;|&nbsp; <b>Seller:</b> {seller}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", margin: "0 0 4px" }}>
              2. Financial Consideration
            </h4>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--navy-soft)",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                margin: "4px 0",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Total Agreement Value:</span>
              <b style={{ fontSize: 15, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
                {extracted.total_value || "—"}
              </b>
            </div>
            <p style={{ fontSize: 12, margin: 0, color: "var(--muted-foreground)" }}>
              {extracted.payment_terms || "Payment terms: As negotiated."}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", margin: "0 0 4px" }}>
              3. Scope &amp; Deliverables
            </h4>
            <p style={{ fontSize: 12, margin: 0 }}>
              {extracted.quantity ? `${extracted.quantity} of ${extracted.product_or_service}. ` : ""}
              {extracted.delivery_terms || "Delivery schedule as agreed."}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase", margin: "0 0 4px" }}>
              4. Special Conditions
            </h4>
            <p style={{ fontSize: 12, margin: 0, color: "var(--muted-foreground)", fontStyle: "italic" }}>
              {notes || "Standard terms apply without special rider conditions."}
            </p>
          </div>
        </div>

        <footer
          style={{
            fontSize: 10,
            color: "var(--muted-foreground)",
            borderTop: "1px solid var(--border)",
            paddingTop: 12,
            marginTop: 8,
            lineHeight: 1.4,
          }}
        >
          Drafted by ARMOR Deal Intelligence from conversation audit records. Verified by mutual commercial review.
        </footer>
      </article>
    </aside>
  );
}

export function DealReview({
  deal,
  setDeal,
  go,
  notify,
  session,
}: {
  deal: DealRecord;
  setDeal: (d: DealRecord) => void;
  go: (s: Screen) => void;
  notify: (s: string) => void;
  session: AuthUser;
}) {
  const [name, setName] = useState(deal.deal_name);
  const [extracted, setExtracted] = useState<ExtractedDeal>(deal.extracted);
  const [notes, setNotes] = useState((deal.extracted.conditions || []).join(" "));
  const [saving, setSaving] = useState(false);
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const setParty = (role: "Buyer" | "Seller", value: string) => {
    const parties = [...(extracted.parties || [])];
    const idx = parties.findIndex((p) => p.role?.toLowerCase() === role.toLowerCase());
    if (idx >= 0) parties[idx] = { name: value, role: parties[idx]?.role || role };
    else parties.push({ name: value, role });
    setExtracted({ ...extracted, parties });
  };

  const save = async (andContinue: boolean) => {
    setSaving(true);
    try {
      const nextExtracted = { ...extracted, conditions: notes ? [notes] : [] };
      const updated = await updateDeal(deal.id, {
        deal_name: name,
        extracted: nextExtracted,
      });
      let final = updated;
      try {
        final = await regenerateEmail(deal.id, nextExtracted, deal.agreement);
      } catch {
        /* best effort */
      }
      setDeal(final);
      notify(andContinue ? "Agreement generated and ready for sharing." : "Draft saved.");
      if (andContinue) go("agreement");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Editorial Header */}
      <EditorialHeading
        kicker="TERM FINALIZATION · STEP 04"
        title="Review the deal."
        subtitle="Fine-tune parties, pricing structures, deliverables, and conditions. The agreement preview continuously reflects your updates."
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
              <ArrowLeft size={14} /> Back
            </button>
            <Button
              variant="secondary"
              onClick={() => save(false)}
              disabled={saving}
              style={{ height: 40, fontSize: 13 }}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => save(true)}
              loading={saving}
              style={{ height: 40, padding: "0 20px", fontSize: 13 }}
            >
              <FileCheck2 size={16} /> Generate Agreement
            </Button>
          </div>
        }
      />

      {/* Editor Split: Left Form, Right Document Preview */}
      <div
        className="editor-split"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card style={{ padding: 22, borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
              Deal Identification
            </h3>
            <Field
              label="Deal Title"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div
              className="form-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginTop: 14,
              }}
            >
              <Field
                label="Buyer Entity"
                value={buyer === "Buyer" ? "" : buyer}
                onChange={(e) => setParty("Buyer", e.target.value)}
                placeholder="e.g. Acme Corp"
              />
              <Field
                label="Seller Entity"
                value={seller === "Seller" ? "" : seller}
                onChange={(e) => setParty("Seller", e.target.value)}
                placeholder="e.g. Nexus Logistics"
              />
              <Field
                label="Deliverable Product / Service"
                value={extracted.product_or_service}
                onChange={(e) =>
                  setExtracted({ ...extracted, product_or_service: e.target.value })
                }
              />
              <Field
                label="Volume / Quantity"
                value={extracted.quantity}
                onChange={(e) =>
                  setExtracted({ ...extracted, quantity: e.target.value })
                }
              />
              <Field
                label="Total Contract Value (Numeric)"
                type="number"
                value={extracted.total_value_numeric ?? ""}
                onChange={(e) =>
                  setExtracted({
                    ...extracted,
                    total_value_numeric: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
              <Field
                label="Currency"
                value={extracted.currency}
                onChange={(e) =>
                  setExtracted({ ...extracted, currency: e.target.value })
                }
              />
            </div>
          </Card>

          <Card style={{ padding: 22, borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
              Payment &amp; Fulfillment Terms
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field
                label="Payment Terms"
                value={extracted.payment_terms}
                onChange={(e) =>
                  setExtracted({ ...extracted, payment_terms: e.target.value })
                }
                placeholder="e.g. 30% advance on PO, 70% upon successful delivery"
              />
              <Field
                label="Delivery Terms"
                value={extracted.delivery_terms}
                onChange={(e) =>
                  setExtracted({ ...extracted, delivery_terms: e.target.value })
                }
                placeholder="e.g. CIF Warehouse, delivery within 21 business days"
              />
              <div>
                <label className="field__label" style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>
                  Special Conditions &amp; Notes
                </label>
                <textarea
                  className="large-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Warranty terms, late delivery liquidated damages, confidentiality clauses..."
                  style={{
                    width: "100%",
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--navy-soft)",
                    color: "var(--foreground)",
                    padding: 10,
                  }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Live Document Preview */}
        <DocumentPreview
          title={name}
          extracted={extracted}
          notes={notes}
          buyer={buyer}
          seller={seller}
          dealId={deal.id}
        />
      </div>
    </div>
  );
}
