import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  Send,
  PenLine,
  AlertTriangle,
  Sun,
  Moon,
  CheckCircle2,
  LockKeyhole,
  Building2,
} from "lucide-react";
import { Button, Card, IconButton } from "../shared/armor-ui";
import { confirmDeal, requestDealChanges } from "@/lib/api";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, money } from "@/lib/format";
import type { DealRecord, Screen } from "@/types/armor";

export function Counterparty({
  deal: initialDeal,
  go,
  notify,
  setDeal,
  theme,
  onToggleTheme,
}: {
  deal: DealRecord;
  go: (s: Screen) => void;
  notify: (s: string) => void;
  setDeal: (d: DealRecord) => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}) {
  const [deal, setLocalDeal] = useState(initialDeal);
  const [changes, setChanges] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const apply = (updated: DealRecord) => {
    setLocalDeal(updated);
    setDeal(updated);
  };

  const doConfirm = async () => {
    setBusy(true);
    try {
      apply(await confirmDeal(deal.id));
      notify("Agreement terms confirmed successfully.");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitChanges = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      apply(await requestDealChanges(deal.id, text.trim()));
      notify("Change request recorded and logged to deal ledger.");
      setChanges(false);
      setText("");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="counterparty-page"
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* External Portal Header */}
      <header
        style={{
          height: 64,
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className="brand"
            onClick={() => go("agreement")}
            style={{
              background: "none",
              border: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 0,
            }}
          >
            <span className="brand__mark">
              <img
                src={theme === "dark" ? "/LOGO_Fair.png" : "/LOGO_Dark.png"}
                alt="Armor"
                style={{ width: 28, height: 28, objectFit: "contain" }}
              />
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.04em", color: "var(--foreground)" }}>
              ARMOR
            </span>
          </button>

          <Button
            variant="secondary"
            onClick={() => go("deal")}
            style={{ height: 32, padding: "0 12px", fontSize: 11 }}
          >
            <ArrowLeft size={13} /> Return to Deal View
          </Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              background: "var(--navy-soft)",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <LockKeyhole size={12} className="text-primary" />
            Verified Agreement Record
          </span>

          {onToggleTheme && (
            <IconButton
              label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={onToggleTheme}
              style={{ width: 32, height: 32 }}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </IconButton>
          )}
        </div>
      </header>

      {/* Main Review Sheet */}
      <main
        style={{
          flex: 1,
          maxWidth: 1040,
          width: "100%",
          margin: "32px auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "var(--primary)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              COMMERCIAL CONFIRMATION PORTAL · #{deal.id.toUpperCase()}
            </span>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, margin: "6px 0 8px", lineHeight: 1.2 }}>
              {deal.deal_name}
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, maxWidth: 640 }}>
              This interactive view reflects what your counterparty (<b>{seller}</b>) sees to verify or request alterations to the commercial parameters.
            </p>
          </div>
          <div>
            <span className={`status status--${dealBadge(deal).toLowerCase().replace(/\s+/g, "-")}`}>
              <span className="status__dot" />
              {dealBadge(deal)}
            </span>
          </div>
        </div>

        {/* 2-Column Split: Terms Sheet & Confirmation Drawer */}
        <div
          className="counterparty-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Terms Sheet Card */}
          <article
            className="terms-sheet"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 32,
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "var(--navy-soft)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                TOTAL CONTRACT VALUE
              </span>
              <b style={{ fontSize: 22, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
                {extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}
              </b>
            </div>

            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "var(--muted-foreground)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                Engaged Commercial Parties
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  background: "var(--navy-soft)",
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>BUYER</span>
                  <b style={{ display: "block", fontSize: 14, color: "var(--foreground)", marginTop: 2 }}>{buyer}</b>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>SELLER / VENDOR</span>
                  <b style={{ display: "block", fontSize: 14, color: "var(--foreground)", marginTop: 2 }}>{seller}</b>
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "var(--muted-foreground)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                Agreed Transaction Parameters
              </h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Product / Service</span>
                  <b style={{ fontSize: 13, color: "var(--foreground)" }}>{extracted.product_or_service || "—"}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Committed Volume</span>
                  <b style={{ fontSize: 13, color: "var(--foreground)" }}>{extracted.quantity || "—"}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Payment Schedule</span>
                  <b style={{ fontSize: 13, color: "var(--foreground)" }}>{extracted.payment_terms || "—"}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Delivery Schedule</span>
                  <b style={{ fontSize: 13, color: "var(--foreground)" }}>{extracted.delivery_terms || "—"}</b>
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px", color: "var(--muted-foreground)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                Special Conditions
              </h3>
              <p style={{ fontSize: 12, color: "var(--foreground)", fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
                {(extracted.conditions || []).join(" ") || "No specific rider conditions stipulated."}
              </p>
            </section>
          </article>

          {/* Action Box */}
          <aside
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 28,
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(47, 129, 247, 0.12)",
                color: "var(--primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShieldCheck size={24} />
            </div>

            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>
                Confirm Commercial Terms
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
                By confirming, both parties certify that these obligations accurately represent the negotiated terms.
              </p>
            </div>

            {deal.confirmation_status === "changes_requested" && deal.change_request && (
              <div
                style={{
                  background: "rgba(158, 106, 3, 0.08)",
                  border: "1px solid rgba(158, 106, 3, 0.3)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <b style={{ fontSize: 11, color: "var(--warning-text)", display: "block", marginBottom: 2 }}>
                  Last Recorded Amendment Request:
                </b>
                <p style={{ fontSize: 12, margin: 0, color: "var(--foreground)" }}>
                  {deal.change_request}
                </p>
              </div>
            )}

            {deal.confirmation_status === "confirmed" && (
              <div
                style={{
                  background: "rgba(35, 134, 54, 0.1)",
                  border: "1px solid rgba(35, 134, 54, 0.3)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CheckCircle2 size={18} className="text-success" />
                <div>
                  <b style={{ fontSize: 13, color: "var(--success-text)", display: "block" }}>
                    Terms Confirmed
                  </b>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    Logged to agreement history
                  </span>
                </div>
              </div>
            )}

            {changes ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  placeholder="Detail any term adjustments needed (e.g. adjust delivery to 4 weeks or advance to 25%)..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
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
                <Button
                  onClick={submitChanges}
                  disabled={!text.trim() || busy}
                  loading={busy}
                  style={{ height: 40, justifyContent: "center", fontSize: 13 }}
                >
                  <Send size={15} /> Submit Amendment Request
                </Button>
                <button
                  onClick={() => setChanges(false)}
                  style={{
                    background: "none",
                    border: 0,
                    color: "var(--muted-foreground)",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Button
                  variant="success"
                  onClick={doConfirm}
                  disabled={busy || deal.confirmation_status === "confirmed"}
                  style={{ height: 42, justifyContent: "center", fontSize: 13 }}
                >
                  <Check size={16} /> I Confirm These Terms
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setChanges(true)}
                  disabled={busy}
                  style={{ height: 38, justifyContent: "center", fontSize: 12 }}
                >
                  <PenLine size={14} /> Request Specific Changes
                </Button>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
