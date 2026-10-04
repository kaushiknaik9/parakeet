import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  ShieldCheck,
  Search,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button, StatusBadge } from "../shared/armor-ui";
import { DealsStarFlowField } from "../shared/DealsStarFlowField";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, money } from "@/lib/format";
import type { DealSummary, DealBadgeStatus, Screen } from "@/types/armor";

export function DealsDirectory({
  query,
  deals,
  loading,
  openDeal,
  go,
}: {
  query: string;
  deals: DealSummary[];
  loading: boolean;
  openDeal: (id: string) => void;
  go: (s: Screen) => void;
}) {
  const [filter, setFilter] = useState<"All" | DealBadgeStatus>("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [hoveredDealId, setHoveredDealId] = useState<string | null>(null);
  const [hoveredYRatio, setHoveredYRatio] = useState<number | null>(null);

  const shown = useMemo(
    () =>
      deals.filter((d) => {
        const badge = dealBadge(d);
        const matchesFilter = filter === "All" || badge === filter;
        const haystack =
          `${d.id} ${d.deal_name} ${partyLabel(d.extracted, "Buyer", "")} ${partyLabel(
            d.extracted,
            "Seller",
            ""
          )}`.toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [deals, filter, query]
  );

  return (
    <div className="deals-hero-workspace">
      {/* ── 1. The Cinematic 3D Star-Flow Field Background ─────────────── */}
      <DealsStarFlowField
        hoveredDealId={hoveredDealId}
        hoveredYRatio={hoveredYRatio}
        hasDeals={shown.length > 0}
      />

      {/* ── 2. Foreground Main Content Region (Natural Flow, No Nested Scrollbars) ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "36px 44px 80px",
          width: "100%",
          minHeight: "calc(100vh - 62px)",
          boxSizing: "border-box",
        }}
      >
        {/* Top Header & Floating Actions Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* Integrated Editorial Header Block */}
          <div
            className="deals-editorial-card"
            style={{
              background: "rgba(6, 10, 18, 0.65)",
              backdropFilter: "blur(18px)",
              borderRadius: 18,
              padding: "20px 24px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
              maxWidth: 560,
            }}
          >
            {/* Kicker */}
            <div
              className="deals-editorial-kicker"
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: "#8EBFC4",
                textTransform: "uppercase",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#38BDF8",
                  boxShadow: "0 0 8px #38BDF8",
                }}
              />
              PORTFOLIO LEDGER · ALL CONTRACTS
            </div>

            {/* Heading */}
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(26px, 3.2vw, 42px)",
                lineHeight: 1.05,
                fontWeight: 400,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
                margin: "0 0 10px",
              }}
            >
              Commercial Deals Directory
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
                lineHeight: 1.6,
                margin: "0 0 18px",
                maxWidth: 480,
              }}
            >
              Every business negotiation analyzed by ARMOR converted into structured commercial terms, tracked commitments, and counterparty records.
            </p>

            {/* Compact Floating Controls: Filters & Count */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div
                className="deals-pills-container"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(10, 16, 26, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.10)",
                  borderRadius: 9999,
                  padding: "3px 4px",
                }}
              >
                {(["All", "Completed", "Under Review"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`deals-floating-pill-btn ${filter === f ? "active" : ""}`}
                  >
                    {f}
                    {f === "All" && ` (${deals.length})`}
                  </button>
                ))}
              </div>

              {/* Floating Deal Count Indicator */}
              <div className="deals-floating-count-badge">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: shown.length > 0 ? "#38BDF8" : "var(--muted-foreground)",
                    boxShadow: shown.length > 0 ? "0 0 8px #38BDF8" : "none",
                  }}
                />
                <span>
                  Showing {shown.length} of {deals.length} deals
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right Floating Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => go("dashboard")}
              className="deals-back-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(10, 16, 26, 0.70)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                borderRadius: 9999,
                padding: "8px 16px",
                color: "var(--foreground)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                backdropFilter: "blur(14px)",
                transition: "all 0.2s ease",
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>

            <Button
              onClick={() => go("new")}
              style={{
                height: 38,
                padding: "0 18px",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                borderRadius: 9999,
                boxShadow: "0 0 20px rgba(47, 129, 247, 0.35)",
              }}
            >
              <Plus size={14} /> New Conversation
            </Button>
          </div>
        </div>

        {/* ── 3. Empty State: Centered Star-Flow Intelligence Beacon ──────── */}
        {!loading && shown.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "48px 24px",
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            {/* Radar Beacon with synchronized pulse ring */}
            <div className="deals-hud-beacon">
              <span className="deals-hud-beacon-pulse" />
              <div className="deals-hud-beacon-core">
                <ShieldCheck size={18} />
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--foreground)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              No deals found
            </div>

            <p
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                lineHeight: 1.6,
                margin: "0 auto 20px",
                maxWidth: 340,
              }}
            >
              {deals.length === 0
                ? "Start a new conversation to ingest meetings, extract commercial terms, and populate your deal intelligence ledger."
                : "Try selecting another filter status or searching for a different company name."}
            </p>

            <Button
              onClick={() => go("new")}
              style={{
                height: 38,
                padding: "0 22px",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                borderRadius: 8,
                background: "#2563EB",
                color: "#FFFFFF",
                border: 0,
                boxShadow: "0 0 18px rgba(37, 99, 235, 0.45)",
              }}
            >
              <Plus size={14} /> Create First Deal
            </Button>
          </div>
        )}

        {/* ── 4. Deal Data Mode: When Deals Exist (Natural Page Flow, No Nested Scrollbar) ── */}
        {!loading && shown.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              width: "100%",
            }}
          >
            {/* Data Console Controls Bar */}
            <div
              className="deals-history-bar"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                background: "rgba(6, 10, 18, 0.60)",
                backdropFilter: "blur(14px)",
                padding: "8px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                className="deals-history-title"
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                DEAL HISTORY · {shown.length} ITEMS
              </div>

              {/* View Mode Toggle (Grid / Table) */}
              <div
                className="deals-viewmode-container"
                style={{
                  display: "inline-flex",
                  background: "rgba(10, 16, 26, 0.70)",
                  border: "1px solid rgba(255, 255, 255, 0.10)",
                  borderRadius: 8,
                  padding: 3,
                }}
              >
                <button
                  onClick={() => setViewMode("grid")}
                  className={`deals-viewmode-btn ${viewMode === "grid" ? "active" : ""}`}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 0,
                    cursor: "pointer",
                    background: viewMode === "grid" ? "rgba(56, 189, 248, 0.20)" : "transparent",
                    color: viewMode === "grid" ? "#38BDF8" : "var(--muted-foreground)",
                    transition: "all 0.2s ease",
                  }}
                  title="Grid View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`deals-viewmode-btn ${viewMode === "table" ? "active" : ""}`}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 0,
                    cursor: "pointer",
                    background: viewMode === "table" ? "rgba(56, 189, 248, 0.20)" : "transparent",
                    color: viewMode === "table" ? "#38BDF8" : "var(--muted-foreground)",
                    transition: "all 0.2s ease",
                  }}
                  title="Table View"
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Natural Document Flow Grid / Table */}
            {viewMode === "grid" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 16,
                  paddingBottom: 24,
                }}
              >
                {shown.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => openDeal(d.id)}
                    onMouseEnter={(e: React.MouseEvent) => {
                      setHoveredDealId(d.id);
                      setHoveredYRatio(
                        Math.max(0, Math.min(1, e.clientY / (window.innerHeight || 800)))
                      );
                    }}
                    onMouseLeave={() => {
                      setHoveredDealId(null);
                      setHoveredYRatio(null);
                    }}
                    className="deals-glass-card"
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <span
                          className="deal-card-id"
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono)",
                            color: "#38BDF8",
                            fontWeight: 700,
                          }}
                        >
                          {d.id}
                        </span>
                        <h4
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            margin: "4px 0 0",
                            color: "var(--foreground)",
                          }}
                        >
                          {d.deal_name}
                        </h4>
                      </div>
                      <StatusBadge status={dealBadge(d)} />
                    </div>

                    <div
                      className="deal-card-divider"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        {partyLabel(d.extracted, "Buyer", "Buyer")} ↔{" "}
                        {partyLabel(d.extracted, "Seller", "Seller")}
                      </span>
                      <b
                        style={{
                          fontSize: 15,
                          fontFamily: "var(--font-mono)",
                          color: "var(--foreground)",
                        }}
                      >
                        {d.extracted.total_value ||
                          money(d.extracted.total_value_numeric, d.extracted.currency)}
                      </b>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 10,
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span>{formatDate(d.created_at)}</span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background:
                            d.generation_mode === "ai"
                              ? "rgba(56, 189, 248, 0.14)"
                              : "rgba(255, 255, 255, 0.06)",
                          color: d.generation_mode === "ai" ? "#38BDF8" : "inherit",
                          fontWeight: 700,
                        }}
                      >
                        {d.generation_mode === "ai" ? "LLM Neural" : "Rule Engine"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="data-table directory"
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.10)",
                  background: "rgba(9, 14, 24, 0.72)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="table-row table-head">
                  <span>Deal Identifier</span>
                  <span>Title / Counterparties</span>
                  <span>Committed Value</span>
                  <span>Status</span>
                  <span>Date Created</span>
                  <span>Model</span>
                </div>
                {shown.map((d) => (
                  <button
                    className="table-row deal-row-interactive"
                    onClick={() => openDeal(d.id)}
                    onMouseEnter={(e: React.MouseEvent) => {
                      setHoveredDealId(d.id);
                      setHoveredYRatio(
                        Math.max(0, Math.min(1, e.clientY / (window.innerHeight || 800)))
                      );
                    }}
                    onMouseLeave={() => {
                      setHoveredDealId(null);
                      setHoveredYRatio(null);
                    }}
                    key={d.id}
                    style={{ textAlign: "left", cursor: "pointer" }}
                  >
                    <span>
                      <b style={{ fontFamily: "var(--font-mono)", color: "#38BDF8" }}>
                        {d.id}
                      </b>
                    </span>
                    <span>
                      <b style={{ color: "var(--foreground)" }}>{d.deal_name}</b>
                      <small style={{ color: "var(--muted-foreground)" }}>
                        {partyLabel(d.extracted, "Buyer", "—")} ↔{" "}
                        {partyLabel(d.extracted, "Seller", "—")}
                      </small>
                    </span>
                    <span>
                      <b style={{ fontFamily: "var(--font-mono)" }}>
                        {d.extracted.total_value ||
                          money(d.extracted.total_value_numeric, d.extracted.currency)}
                      </b>
                    </span>
                    <span>
                      <StatusBadge status={dealBadge(d)} />
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {formatDate(d.created_at)}
                    </span>
                    <span>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-mono)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background:
                            d.generation_mode === "ai"
                              ? "rgba(56, 189, 248, 0.14)"
                              : "rgba(255, 255, 255, 0.06)",
                          color: d.generation_mode === "ai" ? "#38BDF8" : "inherit",
                          fontWeight: 700,
                        }}
                      >
                        {d.generation_mode === "ai" ? "LLM Neural" : "Rule Engine"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
