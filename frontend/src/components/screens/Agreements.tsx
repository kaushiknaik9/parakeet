import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button, StatusBadge } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { AgreementsStarField } from "../shared/AgreementsStarField";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, money } from "@/lib/format";
import type { DealSummary, Screen } from "@/types/armor";

export function Agreements({
  deals,
  loading,
  openDeal,
  go,
}: {
  deals: DealSummary[];
  loading: boolean;
  openDeal: (id: string) => void;
  go: (s: Screen) => void;
}) {
  const [q, setQ] = useState("");
  const shown = deals.filter((d) =>
    `${d.id} ${d.deal_name}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="agreements-hero-workspace">
      {/* ── Cinematic 3D Flowing Star / Particle Environment ───────────── */}
      <AgreementsStarField hasAgreements={shown.length > 0} />

      {/* ── Foreground Content ────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "36px 44px 80px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Editorial Header */}
        <EditorialHeading
          kicker="FORMAL CONTRACTS · COMPLIANCE REPOSITORY"
          title="Commercial Agreements"
          subtitle="Every legally structured agreement drafted by ARMOR from negotiation records, ready for counterparty transmission, electronic signature, and execution."
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="back-link"
                onClick={() => go("dashboard")}
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
                onClick={() => go("new")}
                style={{ height: 40, padding: "0 18px", fontSize: 13 }}
              >
                <Plus size={16} /> New Agreement
              </Button>
            </div>
          }
        />

        {/* Clean, Compact Search Control without oversized outer borders */}
        <div
          style={{
            position: "relative",
            maxWidth: 380,
            width: "100%",
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-foreground)",
              pointerEvents: "none",
            }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by agreement title or ID..."
            className="agreements-search-input"
            style={{
              paddingLeft: 34,
              paddingRight: 12,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              width: "100%",
              fontSize: 12,
              color: "var(--foreground)",
            }}
          />
        </div>

        {loading && (
          <p
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
              padding: "16px 0",
            }}
          >
            Querying agreement records…
          </p>
        )}

        {/* Document Grid / Table */}
        {!loading && shown.length > 0 && (
          <div
            className="data-table directory agreements-table agreements-glass-table"
            style={{
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div className="table-row table-head">
              <span>Agreement &amp; ID</span>
              <span>Counterparty</span>
              <span>Total Valuation</span>
              <span>Confirmation Status</span>
              <span>Last Modified</span>
              <span>Action</span>
            </div>
            {shown.map((a) => (
              <div
                className="table-row deal-row-interactive"
                key={a.id}
                style={{ alignItems: "center" }}
              >
                <span>
                  <b style={{ color: "var(--foreground)" }}>{a.deal_name}</b>
                  <small
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--primary)",
                    }}
                  >
                    ARMOR-{a.id.toUpperCase()}
                  </small>
                </span>
                <span>{partyLabel(a.extracted, "Seller", "—")}</span>
                <span>
                  <b style={{ fontFamily: "var(--font-mono)" }}>
                    {a.extracted.total_value ||
                      money(a.extracted.total_value_numeric, a.extracted.currency)}
                  </b>
                </span>
                <span>
                  <StatusBadge status={dealBadge(a)} />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                  }}
                >
                  {formatDate(a.updated_at)}
                </span>
                <span className="row-actions">
                  <Button
                    variant="secondary"
                    onClick={() => openDeal(a.id)}
                    style={{ height: 30, padding: "0 10px", fontSize: 11 }}
                  >
                    Inspect <ArrowRight size={12} />
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Completely Transparent Empty State — sitting directly on 3D particle landscape */}
        {!loading && !shown.length && (
          <div
            className="agreements-empty-state"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "70px 20px 50px",
              background: "transparent",
              border: "none",
              boxShadow: "none",
              maxWidth: 520,
              margin: "0 auto",
              width: "100%",
            }}
          >
            {/* Subtle Pulsing ARMOR Blue Shield Icon */}
            <div
              className="agreements-shield-glow"
              style={{
                width: 52,
                height: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
                marginBottom: 16,
              }}
            >
              <ShieldCheck size={36} strokeWidth={1.8} />
            </div>

            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: "var(--foreground)",
                margin: "0 0 10px",
                letterSpacing: "-0.01em",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.90)",
              }}
            >
              No agreements found
            </h3>

            <p
              style={{
                fontSize: 13,
                color: "var(--muted-foreground)",
                maxWidth: 440,
                margin: "0 auto",
                lineHeight: 1.6,
                textShadow: "0 2px 10px rgba(0, 0, 0, 0.90)",
              }}
            >
              {q
                ? "No agreements match your search criteria."
                : "Start with a conversation transcript to generate your first binding commercial agreement."}
            </p>

            {!q && (
              <div style={{ marginTop: 24 }}>
                <Button
                  onClick={() => go("new")}
                  style={{
                    height: 40,
                    padding: "0 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.45)",
                  }}
                >
                  <Plus size={16} /> Create Agreement
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
