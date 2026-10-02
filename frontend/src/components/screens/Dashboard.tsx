import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Handshake, Plus, Sparkles, Video, Mic } from "lucide-react";
import { Button, Card, EmptyState, StatusBadge } from "../shared/armor-ui";
import { formatDate, money } from "@/lib/format";
import type { DealSummary, Profile, DealBadgeStatus, ExtractedDeal, Screen } from "@/types/armor";

function dealBadge(deal: { extracted: ExtractedDeal; confirmation_status?: string }): DealBadgeStatus {
  switch (deal.confirmation_status) {
    case "confirmed": return "Confirmed";
    case "changes_requested": return "Changes Requested";
    case "awaiting_counterparty": return "Awaiting Counterparty";
    default: return (deal.extracted.conflicts?.length ?? 0) > 0 ? "Under Review" : "Completed";
  }
}

function partyLabel(extracted: ExtractedDeal, role: "Buyer" | "Seller", fallback: string) {
  const p = extracted.parties?.find((x) => x.role?.toLowerCase() === role.toLowerCase());
  return p?.name || extracted.parties?.[role === "Buyer" ? 0 : 1]?.name || fallback;
}

export function Dashboard({ profile, deals, loading, error, go, openDeal }: {
  profile: Profile | null; deals: DealSummary[]; loading: boolean; error: string | null;
  go: (s: Screen) => void; openDeal: (id: string) => void;
}) {
  const needsReview = deals.filter((d) => dealBadge(d) === "Under Review").length;
  const currency = profile?.default_currency || deals[0]?.extracted?.currency || "INR";
  const totalValue = deals.reduce((sum, d) => sum + (d.extracted?.total_value_numeric || 0), 0);
  const aiCount = deals.filter((d) => d.generation_mode === "ai").length;
  const metrics = [
    { l: "Total Deals", v: String(deals.length).padStart(2, "0"), d: `${money(totalValue, currency)} tracked`, i: Handshake },
    { l: "Needs Review", v: String(needsReview).padStart(2, "0"), d: "Deals with flagged contradictions", i: AlertTriangle },
    { l: "LLM-Analyzed", v: String(aiCount).padStart(2, "0"), d: "Using a configured LLM key", i: Sparkles },
    { l: "Completed", v: String(deals.length - needsReview).padStart(2, "0"), d: "No open contradictions", i: CheckCircle2 },
  ];

  const shown = deals.slice(0, 6);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORKSPACE</span>
          <h2>Good to see you, {profile?.company_name || "there"}</h2>
          <p>Here's what's happening across your deals.</p>
        </div>
        <Button onClick={() => go("new")}><Plus size={17} />New Conversation</Button>
      </div>
      <section className="action-grid">
        <Card className="action-card" onClick={() => go("meeting")}>
          <div className="action-card__icon"><Video /></div>
          <div><span className="eyebrow">LIVE NOTES</span><h3>Capture a live conversation</h3><p>Keep the call open in your usual meeting app, and take structured notes here while Armor prepares them for analysis.</p><span className="text-action">Start Live Notes <ArrowRight size={16} /></span></div>
        </Card>
        <Card className="action-card" onClick={() => go("recording")}>
          <div className="action-card__icon action-card__icon--dark"><Mic /></div>
          <div><span className="eyebrow">IN PERSON</span><h3>Record an offline meeting</h3><p>Record the conversation from your microphone and let Armor transcribe and diarize it automatically.</p><span className="text-action">Start Recording <ArrowRight size={16} /></span></div>
        </Card>
      </section>
      <section>
        <div className="section-title"><h3>Business overview</h3><span>Live from your deals</span></div>
        <div className="metrics">{metrics.map(({ l, v, d, i: I }) => (
          <Card className="metric" key={l}><div className="metric__top"><span className="metric__icon"><I size={18} /></span></div><b>{v}</b><h4>{l}</h4><p>{d}</p></Card>
        ))}</div>
      </section>
      <section>
        <div className="section-title"><div><h3>Recent deals</h3><span>Your most recently analyzed conversations</span></div><button onClick={() => go("deals")}>View all <ArrowRight size={15} /></button></div>
        {loading && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading deals…</p>}
        {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
        {!loading && !error && shown.length === 0 && (
          <EmptyState title="No deals yet" body="Start a conversation to create your first deal." />
        )}
        {shown.length > 0 && (
          <div className="data-table">
            <div className="table-row table-head"><span>Deal</span><span>Counterparty</span><span>Value</span><span>Status</span><span>Mode</span><span>Created</span></div>
            {shown.map((d) => (
              <button className="table-row" key={d.id} onClick={() => openDeal(d.id)}>
                <span><b>{d.id}</b><small>{d.deal_name}</small></span>
                <span>{partyLabel(d.extracted, "Seller", "—")}</span>
                <span><b>{d.extracted?.total_value || money(d.extracted?.total_value_numeric, d.extracted?.currency)}</b></span>
                <span><StatusBadge status={dealBadge(d)} /></span>
                <span>{d.generation_mode === "ai" ? "LLM" : "Rule-based"}</span>
                <span>{formatDate(d.created_at)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
