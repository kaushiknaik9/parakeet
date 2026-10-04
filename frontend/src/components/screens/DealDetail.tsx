import { useState } from "react";
import {
  ArrowLeft,
  Trash2,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  Wand2,
  RefreshCcw,
  Check,
  Copy,
  Mail,
  ArrowRight,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button, Card, Field, IconButton, Modal, StatusBadge } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { deleteDeal, simulateWhatIf, applyChange, regenerateEmail } from "@/lib/api";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, formatDateTime, money } from "@/lib/format";
import type { DealRecord, ExtractedDeal, Conflict, WhatIfResult, Screen } from "@/types/armor";

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const isHigh = conflict.severity === "high";

  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${isHigh ? "rgba(218, 54, 51, 0.4)" : "var(--border)"}`,
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: 13, color: "var(--foreground)" }}>{conflict.topic}</b>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fontWeight: 800,
            textTransform: "uppercase",
            color: isHigh ? "var(--danger-text)" : "var(--warning-text)",
          }}
        >
          {conflict.severity} severity
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          background: "var(--navy-soft)",
          padding: 10,
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        <p style={{ margin: 0 }}>
          <b style={{ color: "var(--muted-foreground)" }}>Earlier:</b> {conflict.earlier_statement}
        </p>
        <p style={{ margin: 0 }}>
          <b style={{ color: "var(--muted-foreground)" }}>Later:</b> {conflict.later_statement}
        </p>
      </div>
      <p style={{ fontSize: 12, margin: 0, color: "var(--primary)" }}>
        <b>Suggested resolution ({conflict.resolved_value}):</b> {conflict.resolution}
      </p>
    </div>
  );
}

function DealSummaryCard({
  extracted,
  dealName,
}: {
  extracted: ExtractedDeal;
  dealName: string;
}) {
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  return (
    <Card style={{ padding: 24, borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase" }}>
            CONFIRMED DEAL PARAMETERS
          </span>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "2px 0 0" }}>{dealName}</h3>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--navy-soft)",
          padding: "12px 20px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          marginBottom: 16,
        }}
      >
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>BUYER</span>
          <b style={{ display: "block", fontSize: 15 }}>{buyer}</b>
        </div>
        <ArrowRight size={18} className="text-primary" />
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>SELLER</span>
          <b style={{ display: "block", fontSize: 15 }}>{seller}</b>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div style={{ background: "var(--navy-soft)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Product / Service</span>
          <b style={{ fontSize: 13 }}>{extracted.product_or_service || "—"}</b>
        </div>
        <div style={{ background: "var(--navy-soft)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Volume / Quantity</span>
          <b style={{ fontSize: 13 }}>{extracted.quantity || "—"}</b>
        </div>
        <div style={{ background: "var(--navy-soft)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Total Consideration</span>
          <b style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
            {extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}
          </b>
        </div>
        <div style={{ background: "var(--navy-soft)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Payment Terms</span>
          <b style={{ fontSize: 13 }}>{extracted.payment_terms || "—"}</b>
        </div>
        <div style={{ background: "var(--navy-soft)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Delivery Schedule</span>
          <b style={{ fontSize: 13 }}>{extracted.delivery_terms || "—"}</b>
        </div>
        <div style={{ background: "var(--navy-soft)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 2 }}>Advance Requirement</span>
          <b style={{ fontSize: 13 }}>{extracted.advance_percent != null ? `${extracted.advance_percent}%` : "—"}</b>
        </div>
      </div>
    </Card>
  );
}

function WhatIfPanel({
  deal,
  setDeal,
  notify,
}: {
  deal: DealRecord;
  setDeal: (d: DealRecord) => void;
  notify: (s: string) => void;
}) {
  const [changeText, setChangeText] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const examples = [
    "Actually, make it 600 units instead of 500",
    "Let's do 40% advance instead",
    "Push the deadline back by two weeks",
  ];

  const simulate = async (text?: string) => {
    const finalText = (text ?? changeText).trim();
    if (!finalText) return;
    setChangeText(finalText);
    setSimulating(true);
    setError(null);
    setResult(null);
    try {
      setResult(await simulateWhatIf(deal.id, finalText));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSimulating(false);
    }
  };

  const apply = async () => {
    if (!result?.updated_extracted) return;
    setApplying(true);
    try {
      const updated = await applyChange(
        deal.id,
        result.updated_extracted,
        result.updated_agreement
      );
      setDeal(updated);
      notify("Simulated change committed to deal record.");
      setResult(null);
      setChangeText("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card style={{ padding: 22, borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
      {!result ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Describe any commercial variation in plain English:
          </label>
          <textarea
            className="large-input"
            value={changeText}
            onChange={(e) => setChangeText(e.target.value)}
            rows={3}
            placeholder='e.g. "Actually, make it 600 units instead of 500" or "Change advance to 40%"'
            style={{ width: "100%", fontSize: 13, borderRadius: 8, padding: 12 }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Try quick variation:</span>
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => simulate(ex)}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--navy-soft)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                {ex}
              </button>
            ))}
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>{error}</p>}
          <div style={{ marginTop: 4 }}>
            <Button onClick={() => simulate()} loading={simulating}>
              <Wand2 size={16} /> Simulate Contractual Impact
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} className="text-primary" />
            <b style={{ fontSize: 13 }}>Simulation Outcome for "{result.change_text}"</b>
          </div>
          <ul
            style={{
              display: "grid",
              gap: 8,
              paddingLeft: 18,
              fontSize: 13,
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            {result.impacts.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {error && <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setChangeText("");
              }}
            >
              <RefreshCcw size={14} /> Try Another Scenario
            </Button>
            <Button onClick={apply} loading={applying}>
              <Check size={16} /> Apply This Change To Deal
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function EmailPanel({
  deal,
  setDeal,
  notify,
}: {
  deal: DealRecord;
  setDeal: (d: DealRecord) => void;
  notify: (s: string) => void;
}) {
  const [subject, setSubject] = useState(deal.email?.subject || "");
  const [body, setBody] = useState(deal.email?.body || "");
  const [regenerating, setRegenerating] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      setDeal(await regenerateEmail(deal.id, deal.extracted, deal.agreement));
      notify("Confirmation email draft regenerated.");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card style={{ padding: 22, borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <b style={{ fontSize: 13, color: "var(--foreground)" }}>{subject || "Confirmation Email Draft"}</b>
        <button
          onClick={regenerate}
          style={{
            border: 0,
            background: "none",
            color: "var(--primary)",
            fontSize: 11,
            display: "flex",
            gap: 4,
            alignItems: "center",
            cursor: "pointer",
            fontWeight: 700,
          }}
          disabled={regenerating}
        >
          <RefreshCcw size={12} className={regenerating ? "animate-spin" : ""} />
          Regenerate
        </button>
      </div>
      <p style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
        {body}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
            notify("Email draft copied to clipboard.");
          }}
          style={{ fontSize: 12 }}
        >
          <Copy size={14} /> Copy Draft
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          }}
          style={{ fontSize: 12 }}
        >
          <Mail size={14} /> Open in Mail App
        </Button>
      </div>
    </Card>
  );
}

export function DealDetail({
  deal,
  setDeal,
  notify,
  go,
  onDeleted,
}: {
  deal: DealRecord;
  setDeal: (d: DealRecord) => void;
  notify: (s: string) => void;
  go: (s: Screen) => void;
  onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteDeal(deal.id);
      notify("Deal deleted successfully.");
      onDeleted();
    } catch (e: any) {
      notify(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Editorial Header */}
      <EditorialHeading
        kicker={`DEAL RECORD · #${deal.id.toUpperCase()}`}
        title={deal.deal_name}
        subtitle={`${buyer} (Buyer) ↔ ${seller} (Seller) · Tracked via ARMOR Intelligence`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="back-link"
              onClick={() => go("deals")}
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
              <ArrowLeft size={14} /> Back to Deals
            </button>
            <Button variant="secondary" onClick={() => go("agreement")} style={{ height: 40, fontSize: 13 }}>
              <FileCheck2 size={15} /> View Formal Agreement
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)} style={{ height: 40, fontSize: 13 }}>
              <Trash2 size={15} /> Delete Deal
            </Button>
          </div>
        }
      />

      {/* Deal Metadata & Health Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          background: "var(--navy-soft)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Analysis Engine
          </span>
          <b style={{ fontSize: 13, display: "block", marginTop: 2 }}>
            {deal.generation_mode === "ai" ? "LLM Neural" : "Rule Engine"}
          </b>
        </div>
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Creation Date
          </span>
          <b style={{ fontSize: 13, display: "block", marginTop: 2 }}>
            {formatDate(deal.created_at)}
          </b>
        </div>
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Total Valuation
          </span>
          <b style={{ fontSize: 13, display: "block", marginTop: 2, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
            {extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}
          </b>
        </div>
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Verification Status
          </span>
          <div style={{ marginTop: 2 }}>
            <StatusBadge status={dealBadge(deal)} />
          </div>
        </div>
      </div>

      {/* Structured Deal Overview */}
      <DealSummaryCard extracted={extracted} dealName={deal.deal_name} />

      {/* Flagged Contradictions (if any) */}
      {extracted.conflicts.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} style={{ color: "var(--warning-text)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Flagged Contradictions ({extracted.conflicts.length})
            </h3>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {extracted.conflicts.map((c, i) => (
              <ConflictCard key={i} conflict={c} />
            ))}
          </div>
        </section>
      )}

      {/* What-If Simulation Engine */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Wand2 size={18} className="text-primary" />
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Contractual "What-If" Simulation
          </h3>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Test variations before updating the binding agreement
          </span>
        </div>
        <WhatIfPanel deal={deal} setDeal={setDeal} notify={notify} />
      </section>

      {/* Confirmation Email Draft */}
      <section>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Generated Confirmation Email
        </h3>
        <EmailPanel deal={deal} setDeal={setDeal} notify={notify} />
      </section>

      {/* Source Transcript */}
      {deal.transcript && (
        <section>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Audited Source Transcript
          </h3>
          <Card
            style={{
              padding: 20,
              whiteSpace: "pre-wrap",
              fontSize: 12,
              lineHeight: 1.6,
              borderRadius: 14,
              background: "var(--navy-soft)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {deal.transcript}
          </Card>
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal
          title="Delete Deal Record?"
          description="This permanently purges the deal record, its extracted terms, audit trail, and generated agreement."
          onClose={() => setConfirmDelete(false)}
        >
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={remove}>
              <Trash2 size={16} /> Permanently Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
