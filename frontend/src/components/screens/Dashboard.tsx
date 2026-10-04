import { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ChevronRight,
  FileCheck2,
  Handshake,
  Mic,
  Plus,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Button, Card, EmptyState, StatusBadge } from "../shared/armor-ui";
import { formatDate, money } from "@/lib/format";
import type {
  DealSummary,
  Profile,
  DealBadgeStatus,
  ExtractedDeal,
  Screen,
} from "@/types/armor";
import { ParticleMorphScene } from "../dashboard/ParticleMorphScene";

function dealBadge(deal: {
  extracted: ExtractedDeal;
  confirmation_status?: string;
}): DealBadgeStatus {
  switch (deal.confirmation_status) {
    case "confirmed":
      return "Confirmed";
    case "changes_requested":
      return "Changes Requested";
    case "awaiting_counterparty":
      return "Awaiting Counterparty";
    default:
      return (deal.extracted.conflicts?.length ?? 0) > 0
        ? "Under Review"
        : "Completed";
  }
}

function partyLabel(
  extracted: ExtractedDeal,
  role: "Buyer" | "Seller",
  fallback: string
) {
  const p = extracted.parties?.find(
    (x) => x.role?.toLowerCase() === role.toLowerCase()
  );
  return p?.name || extracted.parties?.[role === "Buyer" ? 0 : 1]?.name || fallback;
}

export function Dashboard({
  profile,
  deals,
  loading,
  error,
  go,
  openDeal,
  theme,
}: {
  profile: Profile | null;
  deals: DealSummary[];
  loading: boolean;
  error: string | null;
  go: (s: Screen) => void;
  openDeal: (id: string) => void;
  theme?: "dark" | "light";
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Section refs for smooth scrolling
  const heroRef = useRef<HTMLElement>(null);
  const listenRef = useRef<HTMLElement>(null);
  const understandRef = useRef<HTMLElement>(null);
  const verifyRef = useRef<HTMLElement>(null);
  const agreementRef = useRef<HTMLElement>(null);
  const commandCenterRef = useRef<HTMLElement>(null);

  // Compute metrics from actual deals
  const needsReview = deals.filter((d) => dealBadge(d) === "Under Review").length;
  const currency =
    profile?.default_currency || deals[0]?.extracted?.currency || "INR";
  const totalValue = deals.reduce(
    (sum, d) => sum + (d.extracted?.total_value_numeric || 0),
    0
  );
  const aiCount = deals.filter((d) => d.generation_mode === "ai").length;
  const confirmedCount = deals.filter(
    (d) => d.confirmation_status === "confirmed"
  ).length;

  const metrics = [
    {
      label: "Total Deals Tracked",
      value: String(deals.length).padStart(2, "0"),
      detail: `${money(totalValue, currency)} volume`,
      icon: Handshake,
      accent: "var(--primary)",
    },
    {
      label: "Flagged Contradictions",
      value: String(needsReview).padStart(2, "0"),
      detail: "Terms requiring verification",
      icon: AlertTriangle,
      accent: needsReview > 0 ? "var(--warning-text)" : "var(--muted-foreground)",
    },
    {
      label: "AI Neural Extractions",
      value: String(aiCount).padStart(2, "0"),
      detail: "Analyzed via LLM engine",
      icon: Activity,
      accent: "var(--accent-foreground)",
    },
    {
      label: "Confirmed Agreements",
      value: String(confirmedCount).padStart(2, "0"),
      detail: "Verified by counterparties",
      icon: FileCheck2,
      accent: "var(--success-text)",
    },
  ];

  const shown = deals.slice(0, 5);

  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Dynamic extracted fragments from recent deals or fallback
  const firstDeal = deals[0]?.extracted;
  const sampleFragments = useMemo(() => {
    if (firstDeal) {
      return [
        `“Quantity agreed: ${firstDeal.quantity || "500 units"} for delivery…”`,
        `“Commercial rate confirmed at ${firstDeal.total_value || "₹800/unit"}…”`,
        `“Payment terms: ${firstDeal.payment_terms || "Net 30 days"} upon delivery…”`,
      ];
    }
    return [
      "“We can commit to 500 units by month end…”",
      "“Price is ₹800 / unit, 30% advance on PO…”",
      "“Payment Net 30, with a standard 12-month warranty…”",
    ];
  }, [firstDeal]);

  return (
    <div
      ref={containerRef}
      className="dashboard-cinematic-wrapper"
      style={{
        position: "relative",
        minHeight: "100vh",
      }}
    >
      {/* ── 3D STATIC-STRUCTURE SPACE-TIME FABRIC WAVE ─────────────────────── */}
      <ParticleMorphScene theme={theme} />

      {/* ── SECTION 1: CENTERED HERO VIEWPORT ──────────────────────────────── */}
      <section
        ref={heroRef}
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "100px 24px 140px",
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
        <div style={{ maxWidth: 840, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Subtle Refined Category Kicker */}
          <div className="dashboard-hero-eyebrow">
            ARMOR / DEAL INTELLIGENCE
          </div>

          {/* Reference Editorial Headline */}
          <h1 className="dashboard-hero-title">
            EVERY
            <br />
            CONVERSATION
            <br />
            HAS A DEAL
            <br />
            INSIDE IT.
          </h1>

          {/* Explanatory Statement */}
          <p className="dashboard-hero-desc">
            ARMOR listens to business conversations, understands commercial negotiations,
            extracts binding terms and detects conflicts.
          </p>

          {/* Single Dominant CTA */}
          <button
            onClick={() => go("new")}
            className="dashboard-hero-btn"
          >
            <Plus size={15} />
            START CONVERSATION
          </button>
        </div>
      </section>

      {/* ── SECTION 2: LISTEN ───────────────────────────────────────────────── */}
      <section
        ref={listenRef}
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "100px 32px",
          maxWidth: 1360,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center", width: "100%" }}>
          <div>
            <span className="dashboard-section-kicker">
              01 / ACOUSTIC INGESTION
            </span>
            <h2 className="dashboard-section-title">
              First, ARMOR listens.
            </h2>
            <p className="dashboard-section-desc">
              Spoken negotiation is volatile and multi-threaded. As dialogue flows,
              the particle terrain surges into rising columns of information, diarizing
              distinct buyer and seller speakers in real time.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={() => go("meeting")}>
                <Video size={15} />
                Live Video HUD
              </Button>
              <Button variant="secondary" onClick={() => go("recording")}>
                <Mic size={15} />
                Audio Recording
              </Button>
            </div>
          </div>

          {/* Luminous Transcript Terms Emerging From Particle Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <div className="dashboard-glass-pill">
              <span className="pill-tag">
                COMMERCIAL VOLUME
              </span>
              <div className="pill-val">
                500 UNITS
              </div>
            </div>

            <div style={{ color: "#8CC9D2", fontSize: 16, opacity: 0.5 }}>↓</div>

            <div className="dashboard-glass-pill">
              <span className="pill-tag">
                UNIT COMMITMENT
              </span>
              <div className="pill-val">
                ₹800 / UNIT
              </div>
            </div>

            <div style={{ color: "#8CC9D2", fontSize: 16, opacity: 0.5 }}>↓</div>

            <div className="dashboard-glass-pill">
              <span className="pill-tag">
                PAYMENT COVENANT
              </span>
              <div className="pill-val">
                NET 30
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: UNDERSTAND ───────────────────────────────────────────── */}
      <section
        ref={understandRef}
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "100px 32px",
          maxWidth: 1360,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {[
              { label: "PARTY", val: "Buyer ↔ Seller Identified", color: "#8CC9D2" },
              { label: "PRODUCT", val: "Catalog SKU & Spec Sheet", color: "#BFD8DD" },
              { label: "QUANTITY", val: "500 Committed Units", color: "#8CC9D2" },
              { label: "PRICE", val: "₹800 / Unit Base Rate", color: "#F4F7F7" },
              { label: "PAYMENT", val: "30% Advance · Net 30", color: "#4FA7C8" },
              { label: "DELIVERY", val: "FOB Warehouse Origin", color: "#DDE8EA" },
              { label: "WARRANTY", val: "12-Month Hardware SLA", color: "#8CC9D2" },
            ].map((node, i) => (
              <div
                key={node.label}
                className="dashboard-glass-card"
                style={{
                  padding: "14px 18px",
                  borderRadius: 10,
                  gridColumn: i === 6 ? "span 2" : "span 1",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: node.color,
                      boxShadow: `0 0 8px ${node.color}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      color: node.color,
                      fontWeight: 700,
                    }}
                  >
                    {node.label}
                  </span>
                </div>
                <div className="card-node-val" style={{ fontSize: 13, fontWeight: 500 }}>
                  {node.val}
                </div>
              </div>
            ))}
          </div>

          <div>
            <span className="dashboard-section-kicker">
              02 / SEMANTIC EXTRACTION
            </span>
            <h2 className="dashboard-section-title">
              Then it understands what was actually negotiated.
            </h2>
            <p className="dashboard-section-desc">
              The thousands of particles converge into 7 semantic anchors. Spoken mentions
              become discrete commercial parameters connected by thin neural relationships,
              creating an immutable structure of commercial intent.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={() => go("deals")}>
                Explore Active Deals ({deals.length})
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: VERIFY (CONFLICT DETECTION) ─────────────────────────── */}
      <section
        ref={verifyRef}
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "100px 32px",
          maxWidth: 1360,
          margin: "0 auto",
        }}
      >
        <div style={{ width: "100%" }}>
          <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 44px" }}>
            <span className="dashboard-section-kicker" style={{ color: "#D97706" }}>
              03 / CONTRADICTION RECONCILIATION
            </span>
            <h2 className="dashboard-section-title">
              Then it checks what was actually agreed.
            </h2>
            <p className="dashboard-section-desc" style={{ margin: 0 }}>
              Contradictions in price, quantity, or delivery dates cost businesses millions.
              The particle sculpture splits into comparative clusters, illuminating numerical discrepancies
              across the conversation before you commit.
            </p>
          </div>

          {/* Visual Contradiction Card */}
          <div
            className="dashboard-contradiction-card"
            style={{
              maxWidth: 820,
              margin: "0 auto",
              padding: 28,
              borderRadius: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 16,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(217, 119, 6, 0.15)",
                    color: "#D97706",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <AlertTriangle size={17} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                    Price Contradiction Detected
                  </h4>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    Unit price mentioned twice with conflicting values across dialogue
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  padding: "4px 10px",
                  borderRadius: 9999,
                  background: "rgba(217, 119, 6, 0.16)",
                  color: "#D97706",
                  fontWeight: 700,
                }}
              >
                FLAGGED FOR REVIEW
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20, alignItems: "center" }}>
              <div
                className="dashboard-contradiction-mention-1"
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                  MENTION 01 · 04:12 (PRELIMINARY)
                </span>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#F85149", margin: "4px 0" }}>
                  ₹780 / unit
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                  “Preliminary seller quote subject to 1,000 unit minimum order.”
                </p>
              </div>

              <div style={{ color: "#D97706", fontWeight: 700, fontSize: 12, textAlign: "center" }}>
                VS
              </div>

              <div
                className="dashboard-contradiction-mention-2"
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "rgba(140, 201, 210, 0.06)",
                  border: "1px solid rgba(140, 201, 210, 0.25)",
                }}
              >
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#8CC9D2" }}>
                  MENTION 02 · 18:45 (ACCEPTED)
                </span>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#3FB950", margin: "4px 0" }}>
                  ₹800 / unit
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                  “Final accepted price revised for 500 unit batch order.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: AGREEMENT ────────────────────────────────────────────── */}
      <section
        ref={agreementRef}
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "100px 32px",
          maxWidth: 1360,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center", width: "100%" }}>
          <div>
            <span className="dashboard-section-kicker" style={{ color: "#2DD4BF" }}>
              04 / CONTRACTUAL EXECUTION
            </span>
            <h2 className="dashboard-section-title">
              Finally, the conversation becomes a verified agreement.
            </h2>
            <p className="dashboard-section-desc">
              The thousands of particles assemble into a protective 3D shield and contract silhouette.
              Verified commercial terms are formatted into a counterparty agreement with legal certainty.
            </p>
            <div style={{ display: "flex", gap: 14 }}>
              <Button
                onClick={() => {
                  if (deals.length > 0 && deals[0]) {
                    openDeal(deals[0].id);
                  } else {
                    go("deals");
                  }
                }}
                style={{ height: 44, padding: "0 20px" }}
              >
                Review Active Agreement
                <ChevronRight size={15} />
              </Button>
              <button
                onClick={() => scrollToSection(commandCenterRef)}
                className="dashboard-secondary-btn"
                style={{
                  height: 44,
                  padding: "0 18px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "var(--foreground)",
                  fontSize: 13,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Open Workspace <ArrowDown size={13} />
              </button>
            </div>
          </div>

          {/* Floating Luminous Agreement Silhouette Display */}
          <div
            onClick={() => {
              if (deals.length > 0 && deals[0]) openDeal(deals[0].id);
              else go("deals");
            }}
            className="dashboard-glass-card"
            style={{
              padding: 28,
              borderRadius: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#8CC9D2", fontWeight: 700 }}>
                  ARMOR LEGAL SPECIFICATION
                </span>
                <h4 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>
                  Commercial Supply Agreement
                </h4>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(63, 185, 80, 0.15)",
                  color: "#3FB950",
                  fontWeight: 700,
                }}
              >
                CONFIRMED
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--muted-foreground)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Contract Value:</span>
                <b style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                  {firstDeal?.total_value || "₹400,000"}
                </b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Delivery Term:</span>
                <b style={{ color: "var(--foreground)" }}>{firstDeal?.delivery_terms || "FOB Origin · 14 Days"}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Payment Term:</span>
                <b style={{ color: "var(--foreground)" }}>{firstDeal?.payment_terms || "30% Advance, Net 30"}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Dispute Resolution:</span>
                <b style={{ color: "var(--foreground)" }}>Arbitration Clause 12.1</b>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#8CC9D2" }}>
                CLICK TO INSPECT CONTRACT →
              </span>
              <ShieldCheck size={16} style={{ color: "#3FB950" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FUNCTIONAL WORKSPACE DASHBOARD ───────────────────────── */}
      <section
        ref={commandCenterRef}
        className="workspace-command-center"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {/* Workspace Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "#8CC9D2",
                  letterSpacing: "0.12em",
                  marginBottom: 6,
                }}
              >
                05 / WORKSPACE HUB
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 32,
                  fontWeight: 400,
                  color: "var(--foreground)",
                  margin: 0,
                }}
              >
                Commercial Command Center
              </h2>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={() => go("new")}>
                <Plus size={16} />
                Start Conversation
              </Button>
              <Button variant="secondary" onClick={() => go("deals")}>
                View All Deals ({deals.length})
              </Button>
            </div>
          </div>

          {/* Quick Capture Options */}
          <div>
            <div className="section-title" style={{ marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>Initiate Capture</h3>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Select conversation medium to start real-time deal structuring
                </span>
              </div>
            </div>

            <div className="action-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card
                className="action-card"
                onClick={() => go("meeting")}
                style={{
                  padding: 22,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: "var(--card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "rgba(140, 201, 210, 0.12)",
                      color: "#8CC9D2",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Video size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "#8CC9D2",
                        letterSpacing: "0.08em",
                      }}
                    >
                      LIVE HUD NOTES
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: "4px 0 6px", color: "var(--foreground)" }}>
                      Capture Video Meeting Call
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 10 }}>
                      Keep your call running in Zoom, Teams, or Meet with a live HUD that isolates prices, quantities, and delivery milestones.
                    </p>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#8CC9D2",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Start Live Notes <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Card>

              <Card
                className="action-card"
                onClick={() => go("recording")}
                style={{
                  padding: 22,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: "var(--card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "rgba(140, 201, 210, 0.12)",
                      color: "#8CC9D2",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Mic size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "#8CC9D2",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ACOUSTIC STT ENGINE
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: "4px 0 6px", color: "var(--foreground)" }}>
                      Record Offline Dialogue
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 10 }}>
                      Record supplier meetings or upload recorded calls. ARMOR transcribes, diarizes speakers, and extracts commercial terms.
                    </p>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#8CC9D2",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Start Recording <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Overview Metrics */}
          <div>
            <div className="section-title" style={{ marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>Commercial Overview</h3>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Aggregated financial commitments across your organization
                </span>
              </div>
            </div>

            <div className="metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {metrics.map((m) => {
                const I = m.icon;
                return (
                  <Card
                    className="metric"
                    key={m.label}
                    style={{
                      padding: 18,
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 6,
                          background: "var(--accent)",
                          display: "grid",
                          placeItems: "center",
                          color: m.accent,
                        }}
                      >
                        <I size={15} />
                      </span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>
                      {m.value}
                    </div>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: "4px 0" }}>
                      {m.label}
                    </h4>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {m.detail}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recently Analyzed Deals Table */}
          <div>
            <div
              className="section-title"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>Recently Analyzed Deals</h3>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Structured commercial terms extracted from recent conversations
                </span>
              </div>
              <button
                onClick={() => go("deals")}
                style={{
                  background: "none",
                  border: 0,
                  color: "var(--primary)",
                  fontWeight: 600,
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                View all deals <ArrowRight size={13} />
              </button>
            </div>

            {loading && (
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "16px 0" }}>
                Querying deal records…
              </p>
            )}
            {error && (
              <p style={{ fontSize: 12, color: "var(--danger)", padding: "16px 0" }}>
                {error}
              </p>
            )}

            {!loading && !error && shown.length === 0 && (
              <EmptyState
                title="No deals created yet"
                body="Start a new conversation or load a sample deal to explore ARMOR's intelligence engine."
                action={
                  <Button onClick={() => go("new")}>
                    <Plus size={16} />
                    Create First Deal
                  </Button>
                }
              />
            )}

            {shown.length > 0 && (
              <div className="data-table" style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: "var(--card)" }}>
                <div className="table-row table-head">
                  <span>Deal Identifier</span>
                  <span>Buyer ↔ Seller</span>
                  <span>Committed Value</span>
                  <span>Verification Status</span>
                  <span>Analysis Mode</span>
                  <span>Created</span>
                </div>
                {shown.map((d) => (
                  <button
                    className="table-row"
                    key={d.id}
                    onClick={() => openDeal(d.id)}
                    style={{ textAlign: "left", cursor: "pointer" }}
                  >
                    <span>
                      <b style={{ fontFamily: "var(--font-mono)", color: "var(--primary)" }}>{d.id}</b>
                      <small style={{ color: "var(--foreground)", fontWeight: 600 }}>{d.deal_name}</small>
                    </span>
                    <span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>
                        {partyLabel(d.extracted, "Buyer", "Buyer")}
                      </span>
                      <small style={{ color: "var(--muted-foreground)" }}>
                        ↔ {partyLabel(d.extracted, "Seller", "Seller")}
                      </small>
                    </span>
                    <span>
                      <b style={{ fontFamily: "var(--font-mono)" }}>
                        {d.extracted?.total_value ||
                          money(d.extracted?.total_value_numeric, d.extracted?.currency)}
                      </b>
                    </span>
                    <span>
                      <StatusBadge status={dealBadge(d)} />
                    </span>
                    <span>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-mono)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: d.generation_mode === "ai" ? "rgba(47, 129, 247, 0.12)" : "var(--secondary)",
                          color: d.generation_mode === "ai" ? "var(--primary)" : "var(--muted-foreground)",
                          fontWeight: 600,
                        }}
                      >
                        {d.generation_mode === "ai" ? "LLM Neural" : "Rule Engine"}
                      </span>
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-foreground)" }}>
                      {formatDate(d.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
