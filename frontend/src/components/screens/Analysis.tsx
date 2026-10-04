import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  BrainCircuit,
  Scale,
  Clock,
  Layers,
} from "lucide-react";
import { Button, Card, StatusBadge } from "../shared/armor-ui";
import { EditorialHeading, CommercialTermPill } from "../shared/DesignComponents";
import { StockWarningsBanner } from "../shared/StockWarningsBanner";
import { money } from "@/lib/format";
import type { DealRecord, ExtractedDeal, Conflict, Screen } from "@/types/armor";

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
        boxShadow: isHigh ? "0 0 16px rgba(218, 54, 51, 0.1)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle
            size={16}
            style={{ color: isHigh ? "var(--danger)" : "var(--warning-text)" }}
          />
          <b style={{ fontSize: 13, color: "var(--foreground)" }}>{conflict.topic}</b>
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fontWeight: 800,
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: 4,
            background: isHigh ? "rgba(218, 54, 51, 0.15)" : "rgba(158, 106, 3, 0.15)",
            color: isHigh ? "var(--danger-text)" : "var(--warning-text)",
            border: `1px solid ${isHigh ? "rgba(218, 54, 51, 0.3)" : "rgba(158, 106, 3, 0.3)"}`,
          }}
        >
          {conflict.severity} severity conflict
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          background: "var(--navy-soft)",
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Earlier in Conversation
          </span>
          <p style={{ fontSize: 12, color: "var(--foreground)", margin: "4px 0 0", fontStyle: "italic" }}>
            "{conflict.earlier_statement}"
          </p>
        </div>
        <div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Later in Conversation
          </span>
          <p style={{ fontSize: 12, color: "var(--foreground)", margin: "4px 0 0", fontStyle: "italic" }}>
            "{conflict.later_statement}"
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(47, 129, 247, 0.08)",
          border: "1px solid rgba(47, 129, 247, 0.25)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12,
        }}
      >
        <Scale size={15} className="text-primary" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: "var(--primary)" }}>Armor Resolution ({conflict.resolved_value}):</strong>{" "}
          <span style={{ color: "var(--foreground)" }}>{conflict.resolution}</span>
        </span>
      </div>
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
  const buyer = extracted.parties?.[0]?.name || "Buyer";
  const seller = extracted.parties?.[1]?.name || "Seller";

  return (
    <Card
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: "var(--primary)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            STRUCTURED EXTRACTION
          </span>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 0" }}>{dealName}</h3>
        </div>
      </div>

      {/* Buyer ↔ Seller visual connection */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--navy-soft)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "16px 24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
            BUYER
          </span>
          <b style={{ fontSize: 16, color: "var(--foreground)" }}>{buyer}</b>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--primary)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
        >
          <span style={{ height: 1, width: 40, background: "var(--border)" }} />
          <ArrowRight size={16} />
          <span style={{ height: 1, width: 40, background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "right" }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
            SELLER
          </span>
          <b style={{ fontSize: 16, color: "var(--foreground)" }}>{seller}</b>
        </div>
      </div>

      {/* Term Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <div className="term" style={{ background: "var(--navy-soft)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
            Product / Service
          </span>
          <b style={{ fontSize: 14, color: "var(--foreground)" }}>{extracted.product_or_service || "—"}</b>
        </div>
        <div className="term" style={{ background: "var(--navy-soft)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
            Quantity
          </span>
          <b style={{ fontSize: 14, color: "var(--foreground)" }}>{extracted.quantity || "—"}</b>
        </div>
        <div className="term" style={{ background: "var(--navy-soft)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
            Total Value
          </span>
          <b style={{ fontSize: 14, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
            {extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}
          </b>
        </div>
        <div className="term" style={{ background: "var(--navy-soft)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
            Payment Terms
          </span>
          <b style={{ fontSize: 13, color: "var(--foreground)" }}>{extracted.payment_terms || "—"}</b>
        </div>
        <div className="term" style={{ background: "var(--navy-soft)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
            Delivery Schedule
          </span>
          <b style={{ fontSize: 13, color: "var(--foreground)" }}>{extracted.delivery_terms || "—"}</b>
        </div>
        <div className="term" style={{ background: "var(--navy-soft)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
            Advance Required
          </span>
          <b style={{ fontSize: 13, color: "var(--foreground)" }}>
            {extracted.advance_percent != null ? `${extracted.advance_percent}%` : "—"}
          </b>
        </div>
      </div>
    </Card>
  );
}

export function Analysis({
  isAnalyzing,
  error,
  deal,
  go,
}: {
  isAnalyzing: boolean;
  error: string | null;
  deal: DealRecord | null;
  go: (s: Screen) => void;
}) {
  if (isAnalyzing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760, margin: "40px auto" }}>
        <Card
          style={{
            padding: 48,
            borderRadius: 20,
            background: "var(--card)",
            border: "1px solid var(--border)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "var(--shadow)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(47, 129, 247, 0.15)",
              color: "var(--primary)",
              display: "grid",
              placeItems: "center",
              marginBottom: 20,
            }}
          >
            <BrainCircuit size={32} className="animate-spin" />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
            Reasoning Across Conversation
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 440, lineHeight: 1.6, marginBottom: 28 }}>
            ARMOR is identifying the commercial commitments, matching obligations, and reconciling any contradictory statements made during the negotiation.
          </p>

          {/* 5-Step Reasoning Pipeline Progress */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              width: "100%",
              background: "var(--navy-soft)",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            {["LISTENED", "UNDERSTOOD", "EXTRACTED", "CROSS-CHECKED", "VERIFIED"].map((st, i) => (
              <div
                key={st}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: i <= 2 ? "var(--primary)" : "var(--card)",
                    color: i <= 2 ? "#fff" : "var(--muted-foreground)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: i <= 2 ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {st}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 760, margin: "40px auto" }}>
        <Card
          className="alert-card"
          style={{
            borderColor: "var(--danger)",
            background: "rgba(218, 54, 51, 0.08)",
            padding: 24,
            borderRadius: 16,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <AlertTriangle size={24} style={{ color: "var(--danger)" }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--danger)" }}>
                ANALYSIS ERROR
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 6px" }}>
                Could not analyze this conversation
              </h3>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 16 }}>
                {error}
              </p>
              <Button variant="secondary" onClick={() => go("transcript")}>
                <ArrowLeft size={15} /> Return to Transcript
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--muted-foreground)" }}>No active deal record available.</p>
        <Button onClick={() => go("new")} style={{ marginTop: 12 }}>
          Start New Conversation
        </Button>
      </div>
    );
  }

  const { extracted, generation_mode } = deal;
  const conflicts = extracted.conflicts || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Editorial Header */}
      <EditorialHeading
        kicker="DEAL UNDERSTANDING · STEP 03"
        title={extracted.product_or_service || deal.deal_name}
        subtitle="Review every structured commercial entity and flagged conversational contradiction before committing to the formal agreement."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="back-link"
              onClick={() => go("transcript")}
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
            <Button onClick={() => go("review")} style={{ height: 40, padding: "0 18px", fontSize: 13 }}>
              Proceed to Deal Agreement <ArrowRight size={15} />
            </Button>
          </div>
        }
      />

      {/* Warehouse Stock Warning Alerts */}
      <StockWarningsBanner warnings={extracted.stock_warnings} stockStatus={extracted.stock_status} />

      {/* Fallback Mode Banner */}
      {generation_mode === "fallback" && (
        <Card
          style={{
            background: "rgba(56, 189, 248, 0.05)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Info size={20} className="text-primary" />
          <div>
            <b style={{ fontSize: 13, color: "var(--foreground)" }}>Rule-Engine Extraction Mode</b>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              Terms were extracted using deterministic NLP heuristics rather than an LLM key. Double-check all numbers below.
            </p>
          </div>
        </Card>
      )}

      {/* Flagged Contradictions Alert */}
      {conflicts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} style={{ color: "var(--warning-text)" }} />
              {conflicts.length} Contradiction{conflicts.length > 1 ? "s" : ""} Flagged by Armor
            </h3>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
              Requires Human Verification
            </span>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {conflicts.map((c, i) => (
              <ConflictCard key={i} conflict={c} />
            ))}
          </div>
        </div>
      ) : (
        <Card
          style={{
            background: "var(--card)",
            border: "1px solid rgba(35, 134, 54, 0.35)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <CheckCircle2 size={20} style={{ color: "var(--success-text)" }} />
          <div>
            <b style={{ fontSize: 13, color: "var(--foreground)" }}>Clean Negotiation Signals</b>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              No conflicting prices, quantities, or delivery dates were detected in this transcript.
            </p>
          </div>
        </Card>
      )}

      {/* Structured Deal Overview */}
      <DealSummaryCard extracted={extracted} dealName={deal.deal_name} />
    </div>
  );
}
