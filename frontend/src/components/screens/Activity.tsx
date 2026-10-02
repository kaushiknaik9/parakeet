import { useState, useEffect } from "react";
import {
  ArrowLeft, Activity, Handshake, PenLine, Send, CheckCircle2, AlertTriangle, Trash2, Info, ArrowRight, RefreshCw, Search, ShieldCheck
} from "lucide-react";
import { Button, Card, EmptyState, Modal } from "../shared/armor-ui";
import { getActivity } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ActivityEvent, Screen } from "@/types/armor";

const ACTIVITY_ICONS: Record<string, { icon: any; tone: string; label: string }> = {
  deal_analyzed: { icon: Handshake, tone: "blue", label: "Deal Analyzed" },
  deal_updated: { icon: PenLine, tone: "warn", label: "Term Modified" },
  deal_shared: { icon: Send, tone: "blue", label: "Shared with Counterparty" },
  deal_confirmed: { icon: CheckCircle2, tone: "green", label: "Terms Confirmed" },
  changes_requested: { icon: AlertTriangle, tone: "warn", label: "Changes Requested" },
  deal_deleted: { icon: Trash2, tone: "danger", label: "Deal Deleted" },
};

export function ActivityCenter({ username, openDeal, go }: { username: string; openDeal: (id: string) => void; go?: (s: Screen) => void }) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    getActivity(username)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [username]);

  const filtered = (events || []).filter((e) => {
    if (filter === "deals" && e.event_type !== "deal_analyzed") return false;
    if (filter === "confirmed" && e.event_type !== "deal_confirmed") return false;
    if (filter === "changes" && e.event_type !== "changes_requested") return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return e.message.toLowerCase().includes(q) || (e.deal_id && e.deal_id.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page Header */}
      <div className="page-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <span className="eyebrow">AUDIT TRAIL</span>
            <h2>Activity Center</h2>
            <p>A real-time, immutable server-side log of every action taken across your deals.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={loadData} loading={loading} style={{ minHeight: 34, fontSize: 12 }}>
              <RefreshCw size={14} /> Refresh Log
            </Button>
            {go && (
              <button className="back-link" onClick={() => go("dashboard")}>
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setFilter("all")}
            className="badge"
            style={{
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 6,
              background: filter === "all" ? "var(--primary)" : "var(--card)",
              color: filter === "all" ? "#fff" : "var(--foreground)",
              border: "1px solid var(--border)",
              fontWeight: 600
            }}
          >
            All Activity ({events?.length || 0})
          </button>
          <button
            onClick={() => setFilter("deals")}
            className="badge"
            style={{
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 6,
              background: filter === "deals" ? "var(--primary)" : "var(--card)",
              color: filter === "deals" ? "#fff" : "var(--foreground)",
              border: "1px solid var(--border)",
              fontWeight: 600
            }}
          >
            Deals Created
          </button>
          <button
            onClick={() => setFilter("confirmed")}
            className="badge"
            style={{
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 6,
              background: filter === "confirmed" ? "var(--primary)" : "var(--card)",
              color: filter === "confirmed" ? "#fff" : "var(--foreground)",
              border: "1px solid var(--border)",
              fontWeight: 600
            }}
          >
            Confirmations
          </button>
          <button
            onClick={() => setFilter("changes")}
            className="badge"
            style={{
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 6,
              background: filter === "changes" ? "var(--primary)" : "var(--card)",
              color: filter === "changes" ? "#fff" : "var(--foreground)",
              border: "1px solid var(--border)",
              fontWeight: 600
            }}
          >
            Change Requests
          </button>
        </div>

        <label className="global-search" style={{ margin: 0, width: 240 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search audit logs..."
          />
        </label>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
      {loading && events === null && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading activity logs…</p>}

      {!loading && filtered.length === 0 && (
        <EmptyState title="No activity recorded" body="Events will appear here automatically when deals are created, updated, or confirmed." />
      )}

      {/* Activity Timeline List */}
      {filtered.length > 0 && (
        <Card className="activity-feed">
          {filtered.map((e) => {
            const { icon: I, tone, label } = ACTIVITY_ICONS[e.event_type] || { icon: Info, tone: "", label: "Event" };
            return (
              <div
                className="activity-item"
                key={e.id}
                onClick={() => setSelectedEvent(e)}
                style={{ cursor: "pointer", transition: "background 0.15s ease" }}
              >
                <span className={`activity-icon ${tone}`}>
                  <I size={16} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b style={{ fontSize: 13 }}>{e.message}</b>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--secondary)", color: "var(--muted-foreground)", fontWeight: 600 }}>
                      {label}
                    </span>
                  </div>
                  {e.deal_id && (
                    <button
                      onClick={(evt) => { evt.stopPropagation(); openDeal(e.deal_id!); }}
                      style={{ background: "none", border: 0, padding: 0, fontSize: 11, color: "var(--primary)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, cursor: "pointer" }}
                    >
                      View related deal #{e.deal_id} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
                <time style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                  {formatDateTime(e.created_at)}
                </time>
              </div>
            );
          })}
        </Card>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          title={`Audit Log #${selectedEvent.id}`}
          description="Server-verified activity record"
          onClose={() => setSelectedEvent(null)}
        >
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <div>
              <span className="field__label">Event Description</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginTop: 2 }}>{selectedEvent.message}</p>
            </div>
            {selectedEvent.deal_id && (
              <div>
                <span className="field__label">Related Deal ID</span>
                <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--primary)", marginTop: 2 }}>#{selectedEvent.deal_id}</p>
              </div>
            )}
            <div>
              <span className="field__label">Timestamp</span>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{formatDateTime(selectedEvent.created_at)}</p>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              {selectedEvent.deal_id && (
                <Button onClick={() => { const dId = selectedEvent.deal_id!; setSelectedEvent(null); openDeal(dId); }}>
                  <Handshake size={15} /> Open Deal
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
