import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, ListFilter, ArrowRight } from "lucide-react";
import { Button, Card, EmptyState, StatusBadge, IconButton } from "../shared/armor-ui";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, money } from "@/lib/format";
import type { DealSummary, DealBadgeStatus, ExtractedDeal } from "@/types/armor";

import type { Screen } from "@/types/armor";

export function DealsDirectory({ query, deals, loading, openDeal, go }: {
  query: string; deals: DealSummary[]; loading: boolean; openDeal: (id: string) => void; go: (s: Screen) => void;
}) {
  const [filter, setFilter] = useState<"All" | DealBadgeStatus>("All");
  const shown = useMemo(() => deals.filter((d) => {
    const badge = dealBadge(d);
    const matchesFilter = filter === "All" || badge === filter;
    const haystack = `${d.id} ${d.deal_name} ${partyLabel(d.extracted, "Buyer", "")} ${partyLabel(d.extracted, "Seller", "")}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [deals, filter, query]);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DEALS</span>
          <h2>Deals</h2>
          <p>Every conversation Armor has turned into a structured deal.</p>
        </div>
        <Button onClick={() => go("new")}><Plus />New Conversation</Button>
      </div>
      <button className="back-link" onClick={() => go("dashboard")}><ArrowLeft size={14} /> Back</button>
      <div className="filterbar">
        <div className="filter-tabs">{(["All", "Completed", "Under Review"] as const).map((f) => (
          <button className={f === filter ? "active" : ""} key={f} onClick={() => setFilter(f)}>{f}</button>
        ))}</div>
        <IconButton label="More filters"><ListFilter /></IconButton>
      </div>
      {loading && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading deals…</p>}
      <div className="data-table directory">
        <div className="table-row table-head"><span>Deal ID</span><span>Name / Parties</span><span>Value</span><span>Status</span><span>Created</span></div>
        {shown.map((d) => (
          <button className="table-row" onClick={() => openDeal(d.id)} key={d.id}>
            <span><b>{d.id}</b></span>
            <span><b>{d.deal_name}</b><small>{partyLabel(d.extracted, "Buyer", "—")} ↔ {partyLabel(d.extracted, "Seller", "—")}</small></span>
            <span><b>{d.extracted.total_value || money(d.extracted.total_value_numeric, d.extracted.currency)}</b></span>
            <span><StatusBadge status={dealBadge(d)} /></span>
            <span>{formatDate(d.created_at)}</span>
          </button>
        ))}
      </div>
      {!loading && !shown.length && <EmptyState title="No matching deals" body="Try another status or search term." />}
    </>
  );
}
