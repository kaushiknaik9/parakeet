import { ArrowLeft, AlertTriangle, CheckCircle2, Info, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { Button, Card, StatusBadge, BOMTable } from "../shared/armor-ui";
import { dealBadge } from "../features/DealHelpers";
import type { DealRecord, ExtractedDeal, Conflict, BOMItem, Screen } from "@/types/armor";


function ConflictCard({ conflict }: { conflict: Conflict }) {
  const isAnomaly = conflict.topic?.includes("Unrealistic") || conflict.topic?.includes("Anomalous");
  return (
    <div style={{ background: isAnomaly ? "rgba(218, 54, 51, 0.08)" : "var(--card)", border: `1px solid ${isAnomaly ? "rgba(218, 54, 51, 0.4)" : "var(--border)"}`, borderRadius: 7, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <b style={{ fontSize: 11, color: isAnomaly ? "var(--danger-text)" : "var(--foreground)" }}>{conflict.topic}</b>
        <span className={conflict.severity === "high" ? "verify-warn" : ""} style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{conflict.severity} severity</span>
      </div>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0" }}><b>Statement:</b> {conflict.earlier_statement}</p>
      {conflict.later_statement && <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0" }}><b>Comparison:</b> {conflict.later_statement}</p>}
      <p style={{ fontSize: 10, marginTop: 6, color: "var(--foreground)" }}><b>Sanity Analysis:</b> {conflict.resolution}</p>
    </div>
  );
}

function DealSummaryCard({ extracted, dealName }: { extracted: ExtractedDeal; dealName: string }) {
  const buyer = extracted.parties?.[0]?.name || "Buyer";
  const seller = extracted.parties?.[1]?.name || "Seller";
  const supply = extracted.supply_terms || {};
  return (
    <Card className="deal-summary">
      <div className="summary-title"><div><span className="eyebrow">ELECTRONICS PROCUREMENT DEAL</span><h3>{dealName}</h3></div></div>
      <div className="parties"><div><span>BUYER</span><b>{buyer}</b></div><ArrowRight /><div><span>SELLER</span><b>{seller}</b></div></div>
      <div className="term-grid">
        <div className="term"><span>Product / Part</span><b>{extracted.product_or_service || "—"}</b></div>
        <div className="term"><span>Total Quantity</span><b>{extracted.quantity || "—"}</b></div>
        <div className="term"><span>Total deal value</span><b>{extracted.total_value || "—"}</b><small className="verify-ok"><CheckCircle2 />Confirmed</small></div>
        <div className="term"><span>Lead Time</span><b>{supply.lead_time || extracted.delivery_terms || "—"}</b></div>
        <div className="term"><span>Warranty / RMA</span><b>{supply.rma_warranty || "Standard RMA"}</b></div>
        <div className="term"><span>Compliance</span><b>{(supply.compliance || ["RoHS", "CE"]).join(", ")}</b></div>
      </div>
      <BOMTable items={extracted.items} currency={extracted.currency} />
    </Card>
  );
}

export function Analysis({ isAnalyzing, error, deal, go }: { isAnalyzing: boolean; error: string | null; deal: DealRecord | null; go: (s: Screen) => void }) {
  if (isAnalyzing) {
    return (
      <Card className="recorder">
        <span className="brand__mark brand__mark--large"><Sparkles /></span>
        <h2>Understanding your conversation</h2>
        <p>Armor is identifying the deal, not just transcribing the words. This usually takes a few seconds.</p>
        <div className="processing-list"><div className="done"><span className="processing-ring" /><b>Extracting terms, conditions and conflicts…</b></div></div>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="alert-card">
        <AlertTriangle />
        <div><span className="eyebrow">ANALYSIS FAILED</span><h3>Couldn't analyze this transcript</h3><p>{error}</p></div>
        <Button variant="secondary" onClick={() => go("transcript")}><ArrowLeft size={16} />Back to transcript</Button>
      </Card>
    );
  }
  if (!deal) return <p>No deal to show yet — start a new conversation.</p>;

  const { extracted, generation_mode } = deal;
  const conflicts = extracted.conflicts || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DEAL UNDERSTANDING</span>
          <h2>Armor found: {extracted.product_or_service || deal.deal_name}</h2>
          <p>Review every extracted term and flagged contradiction before creating the agreement.</p>
        </div>
        <StatusBadge status={generation_mode === "ai" ? "AI Analysis" : "Fallback Analysis"} />
      </div>
      <button className="back-link" onClick={() => go("transcript")}><ArrowLeft size={14} /> Back</button>
      {generation_mode === "fallback" && (
        <Card className="alert-card" style={{ marginBottom: 16 }}>
          <Info /><div><span className="eyebrow">RULE-BASED MODE</span><h3>No LLM key configured</h3><p>The server extracted these terms with rule-based patterns rather than an LLM. Double-check the numbers below before continuing.</p></div>
        </Card>
      )}
      {conflicts.length > 0 ? (
        <Card className="alert-card">
          <AlertTriangle />
          <div>
            <span className="eyebrow">CONFIRMATION REQUIRED</span>
            <h3>{conflicts.length} contradiction{conflicts.length > 1 ? "s" : ""} detected in the transcript</h3>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {conflicts.map((c, i) => <ConflictCard key={i} conflict={c} />)}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="alert-card" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <CheckCircle2 style={{ color: "var(--success)" }} />
          <div><span className="eyebrow">CLEAN TRANSCRIPT</span><h3>No contradictions detected</h3><p>Armor didn't find any conflicting numbers or terms in this conversation.</p></div>
        </Card>
      )}
      <DealSummaryCard extracted={extracted} dealName={deal.deal_name} />
      <div className="sticky-actions">
        <span><ShieldCheck />{conflicts.length > 0 ? `${conflicts.length} term${conflicts.length > 1 ? "s" : ""} flagged for review` : "All terms verified"}</span>
        <Button onClick={() => go("review")}>Create Editable Deal <ArrowRight size={16} /></Button>
      </div>
    </>
  );
}
