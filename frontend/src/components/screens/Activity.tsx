import { useState, useEffect } from "react";
import { ArrowLeft, Activity, Handshake, PenLine, Send, CheckCircle2, AlertTriangle, Trash2, Info, ArrowRight } from "lucide-react";
import { Button, Card, EmptyState } from "../shared/armor-ui";
import { getActivity } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ActivityEvent } from "@/types/armor";

const ACTIVITY_ICONS: Record<string, { icon: any; tone: string }> = {
  deal_analyzed: { icon: Handshake, tone: "blue" },
  deal_updated: { icon: PenLine, tone: "warn" },
  deal_shared: { icon: Send, tone: "blue" },
  deal_confirmed: { icon: CheckCircle2, tone: "" },
  changes_requested: { icon: AlertTriangle, tone: "warn" },
  deal_deleted: { icon: Trash2, tone: "warn" },
};

import type { Screen } from "@/types/armor";

export function ActivityCenter({ username, openDeal, go }: { username: string; openDeal: (id: string) => void; go?: (s: Screen) => void }) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActivity(username).then(setEvents).catch((e) => setError(e.message));
  }, [username]);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACTIVITY</span>
          <h2>Activity</h2>
          <p>A real, server-side log of what's happened across your deals.</p>
        </div>
      </div>
      {go && <button className="back-link" onClick={() => go("dashboard")}><ArrowLeft size={14} /> Back</button>}
      {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
      {events === null && !error && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading…</p>}
      {events && events.length === 0 && (
        <EmptyState title="Nothing yet" body="Activity will appear here once you analyze a conversation." />
      )}
      {events && events.length > 0 && (
        <Card className="activity-feed">
          {events.map((e) => {
            const { icon: I, tone } = ACTIVITY_ICONS[e.event_type] || { icon: Info, tone: "" };
            return (
              <div className="activity-item" key={e.id}>
                <span className={`activity-icon ${tone}`}><I /></span>
                <div><b>{e.message}</b>{e.deal_id && <button onClick={() => openDeal(e.deal_id!)}>View related deal <ArrowRight /></button>}</div>
                <time>{formatDateTime(e.created_at)}</time>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
