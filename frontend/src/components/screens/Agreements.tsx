import { useState } from "react";
import { ArrowLeft, Plus, Search, ArrowRight, FileCheck2 } from "lucide-react";
import { Button, Card, EmptyState, StatusBadge, IconButton } from "../shared/armor-ui";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, money } from "@/lib/format";
import type { DealSummary, ExtractedDeal } from "@/types/armor";

import type { Screen } from "@/types/armor";

export function Agreements({ deals, loading, openDeal, go }: { deals: DealSummary[]; loading: boolean; openDeal: (id: string) => void; go: (s: Screen) => void }) {
  const [q, setQ] = useState("");
  const shown = deals.filter((d) => `${d.id} ${d.deal_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">AGREEMENTS</span>
          <h2>Agreements</h2>
          <p>Every agreement Armor has drafted from your deals.</p>
        </div>
        <Button onClick={() => go("new")}><Plus />New Agreement</Button>
      </div>
      <button className="back-link" onClick={() => go("dashboard")}><ArrowLeft size={14} /> Back</button>
      <label className="page-search"><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agreement or deal" /></label>
      {loading && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading…</p>}
      <div className="data-table directory agreements-table">
        <div className="table-row table-head"><span>Agreement</span><span>Counterparty</span><span>Value</span><span>Status</span><span>Last updated</span><span>Actions</span></div>
        {shown.map((a) => (
          <div className="table-row" key={a.id}>
            <span><b>{a.deal_name}</b><small>{a.id}</small></span>
            <span>{partyLabel(a.extracted, "Seller", "—")}</span>
            <span>{a.extracted.total_value || money(a.extracted.total_value_numeric, a.extracted.currency)}</span>
            <span><StatusBadge status={dealBadge(a)} /></span>
            <span>{formatDate(a.updated_at)}</span>
            <span className="row-actions">
              <IconButton label="View agreement" onClick={() => openDeal(a.id)}><ArrowRight /></IconButton>
            </span>
          </div>
        ))}
      </div>
      {!loading && !shown.length && <EmptyState title="No agreements yet" body="Analyze a conversation to generate your first agreement." />}
    </>
  );
}
