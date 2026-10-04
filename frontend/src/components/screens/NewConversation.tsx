import React, { useState } from "react";
import {
  ArrowLeft,
  Video,
  Mic,
  ArrowRight,
  AlertTriangle,
  Info,
  FileText,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button, Card } from "../shared/armor-ui";
import {
  EditorialHeading,
  WaveformVisualizer,
} from "../shared/DesignComponents";
import { CinematicSpaceBackground } from "../shared/CinematicSpaceBackground";
import type { HealthStatus, Screen } from "@/types/armor";

export function NewConversation({
  go,
  health,
  conn,
  onRetry,
  onUseSample,
}: {
  go: (s: Screen) => void;
  health: HealthStatus | null;
  conn: string;
  onRetry: () => void;
  onUseSample: () => void;
}) {
  const [hoveredCard, setHoveredCard] = useState<"live" | "offline" | null>(null);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100vh - 120px)",
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      {/* ── Cinematic Atmospheric Star & Particle Background Layer ───────── */}
      <CinematicSpaceBackground hoveredCard={hoveredCard} />

      {/* ── Foreground Content (Solid, Clear, Unaffected by Background) ───── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Editorial Header */}
        <EditorialHeading
          kicker="CONVERSATION INGESTION · STEP 01"
          title="Start with the conversation."
          subtitle="ARMOR ingests live calls, offline audio recordings, or existing transcripts to detect negotiated terms, extract prices and quantities, and reconcile contractual disputes."
          actions={
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
          }
        />

        {/* Connectivity Alert */}
        {conn === "offline" && (
          <Card
            className="alert-card"
            style={{
              borderColor: "var(--danger)",
              background: "rgba(218, 54, 51, 0.08)",
              padding: 16,
              borderRadius: 12,
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <AlertTriangle style={{ color: "var(--danger)" }} size={24} />
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: "var(--danger)",
                  }}
                >
                  BACKEND UNREACHABLE
                </span>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 4px" }}>
                  Cannot Connect to the Armor API
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  The Flask backend at http://127.0.0.1:5000 is not responding. Ensure the backend server is running.
                </p>
              </div>
              <Button variant="secondary" onClick={onRetry}>
                Retry Connection
              </Button>
            </div>
          </Card>
        )}

        {/* STT Status Alert */}
        {conn === "online" && health && !health.stt_configured && (
          <Card
            className="alert-card"
            style={{
              borderColor: "rgba(56, 189, 248, 0.3)",
              background: "rgba(56, 189, 248, 0.05)",
              padding: 16,
              borderRadius: 12,
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Info style={{ color: "var(--accent-foreground)" }} size={24} />
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: "var(--accent-foreground)",
                  }}
                >
                  SPEECH-TO-TEXT KEY NOTICE
                </span>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 4px" }}>
                  No Audio Transcription API Key Configured
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  Add ASSEMBLYAI_API_KEY or OPENAI_API_KEY to backend/.env for audio transcription. You can still paste transcripts or load our pre-built sample below.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Two Major Ingestion Channels */}
        <div
          className="choice-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          {/* Choice 1: Live Notes */}
          <div
            onClick={() => go("meeting")}
            onMouseEnter={() => setHoveredCard("live")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: "var(--card)",
              border: hoveredCard === "live" ? "1px solid rgba(47, 129, 247, 0.5)" : "1px solid var(--border)",
              borderRadius: 16,
              padding: 28,
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
              boxShadow: hoveredCard === "live"
                ? "0 14px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(47, 129, 247, 0.15)"
                : "var(--shadow-sm)",
              transform: hoveredCard === "live" ? "translateY(-2px)" : "none",
            }}
            className="choice-box"
          >
            <div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "rgba(47, 129, 247, 0.12)",
                  color: "var(--primary)",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 20,
                }}
              >
                <Video size={26} />
              </div>

              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                }}
              >
                LIVE VIDEO CALLS
              </span>

              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 10px" }}>
                Live Notes &amp; HUD
              </h3>

              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                Keep your client call open in Zoom, Teams, or Meet. Take structured notes with local camera preview while Armor continuously monitors commercial terms.
              </p>
            </div>

            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 6 }}>
                Start Live Notes <ArrowRight size={15} />
              </span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                Camera &amp; Notes
              </span>
            </div>
          </div>

          {/* Choice 2: Offline Recording */}
          <div
            onClick={() => go("recording")}
            onMouseEnter={() => setHoveredCard("offline")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: "var(--card)",
              border: hoveredCard === "offline" ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid var(--border)",
              borderRadius: 16,
              padding: 28,
              cursor: "pointer",
              opacity: 1,
              transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
              boxShadow: hoveredCard === "offline"
                ? "0 14px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.15)"
                : "var(--shadow-sm)",
              transform: hoveredCard === "offline" ? "translateY(-2px)" : "none",
            }}
            className="choice-box"
          >
            <div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "rgba(56, 189, 248, 0.12)",
                  color: "#38BDF8",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 20,
                }}
              >
                <Mic size={26} />
              </div>

              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#38BDF8",
                  textTransform: "uppercase",
                }}
              >
                IN-PERSON / AUDIO FILE
              </span>

              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 10px" }}>
                Offline Recording
              </h3>

              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                Capture conversations directly from your microphone or upload existing audio recordings. Armor automatically diarizes speakers and transcribes the negotiation.
              </p>
            </div>

            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "#38BDF8", display: "flex", alignItems: "center", gap: 6 }}>
                Start Recording <ArrowRight size={15} />
              </span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                STT Diarization
              </span>
            </div>
          </div>
        </div>

        {/* Alternative Fast Ingest Strip */}
        <Card
          style={{
            padding: 20,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--navy-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "var(--card)",
                border: "1px solid var(--border)",
                display: "grid",
                placeItems: "center",
                color: "var(--primary)",
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                Already have a meeting transcript?
              </h4>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                Paste your speaker-labelled text directly or test the pipeline with our sample agreement.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Button
              variant="secondary"
              onClick={onUseSample}
              style={{ fontSize: 12, height: 36, padding: "0 14px" }}
            >
              <Sparkles size={14} />
              Load Sample Deal
            </Button>
            <Button
              onClick={() => go("transcript")}
              style={{ fontSize: 12, height: 36, padding: "0 14px" }}
            >
              <FileText size={14} />
              Paste Transcript Directly
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
