import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Handshake,
  PenLine,
  Send,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Info,
  ArrowRight,
} from "lucide-react";
import { Card, EmptyState } from "../shared/armor-ui";
import { EditorialHeading, TimelineItem } from "../shared/DesignComponents";
import { ActivityFlowField } from "../shared/ActivityFlowField";
import { getActivity } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ActivityEvent, Screen } from "@/types/armor";

const ACTIVITY_META: Record<
  string,
  { icon: any; tone: "primary" | "warning" | "success" | "muted" }
> = {
  deal_analyzed: { icon: Handshake, tone: "primary" },
  deal_updated: { icon: PenLine, tone: "warning" },
  deal_shared: { icon: Send, tone: "primary" },
  deal_confirmed: { icon: CheckCircle2, tone: "success" },
  changes_requested: { icon: AlertTriangle, tone: "warning" },
  deal_deleted: { icon: Trash2, tone: "warning" },
};

export function ActivityCenter({
  username,
  openDeal,
  go,
}: {
  username: string;
  openDeal: (id: string) => void;
  go?: (s: Screen) => void;
}) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActivity(username)
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, [username]);

  return (
    <div className="activity-hero-workspace">
      {/* ── 3D Flowing Live Commercial Intelligence Particle Streams ────── */}
      <ActivityFlowField hasContent={events !== null && events.length > 0} />

      {/* ── Foreground Content ────────────────────────────────────────── */}
      <div
        className="page-content"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 920,
          margin: "0 auto",
          padding: "36px 32px 80px",
          width: "100%",
        }}
      >
        {/* Editorial Header */}
        <EditorialHeading
          kicker="IMMUTABLE AUDIT LOG · COMPLIANCE LEDGER"
          title="Activity Ledger"
          subtitle="A chronological, cryptographic-grade event log recording deal analyses, contract modifications, counterparty transmissions, and executed confirmations."
          actions={
            go && (
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
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            )
          }
        />

        {error && (
          <p style={{ fontSize: 12, color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {events === null && !error && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Retrieving audit timeline…
          </p>
        )}

        {events && events.length === 0 && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              background: "transparent",
            }}
          >
            <EmptyState
              title="No activity recorded yet"
              body="Every action taken across conversations and agreements will be permanently logged here."
            />
          </div>
        )}

        {/* Vertical Connected Timeline */}
        {events && events.length > 0 && (
          <Card
            className="activity-timeline-card"
            style={{
              padding: "32px 28px",
              borderRadius: 16,
              background: "rgba(10, 16, 26, 0.65)",
              backdropFilter: "blur(14px)",
              border: "1px solid var(--border)",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
            }}
          >
            {events.map((e, index) => {
              const meta =
                ACTIVITY_META[e.event_type] || { icon: Info, tone: "muted" };
              const isLast = index === events.length - 1;

              return (
                <TimelineItem
                  key={e.id}
                  icon={meta.icon}
                  tone={meta.tone}
                  title={e.message}
                  time={formatDateTime(e.created_at)}
                  isLast={isLast}
                  dealAction={
                    e.deal_id ? (
                      <button
                        onClick={() => openDeal(e.deal_id!)}
                        style={{
                          background: "none",
                          border: 0,
                          color: "var(--primary)",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: 0,
                          marginTop: 4,
                        }}
                      >
                        Inspect related deal #{e.deal_id} <ArrowRight size={12} />
                      </button>
                    ) : null
                  }
                />
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
