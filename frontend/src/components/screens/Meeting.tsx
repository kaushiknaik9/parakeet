import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Camera,
  VideoOff,
  Square,
  Plus,
  Sparkles,
  ShieldCheck,
  Monitor,
  MessageSquare,
  Volume2,
  Lock,
  CheckCircle2,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Button, IconButton, Modal } from "../shared/armor-ui";
import { CommercialTermPill } from "../shared/DesignComponents";
import type { Screen } from "@/types/armor";

export function Meeting({
  go,
  onFinish,
}: {
  go: (s: Screen) => void;
  onFinish: (transcript: string) => void;
}) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [entries, setEntries] = useState<{ speaker: string; text: string; time: string }[]>([
    { speaker: "Me", text: "Meeting started. Discussing commercial agreement terms.", time: "00:01" },
  ]);
  const [speaker, setSpeaker] = useState("Me");
  const [draft, setDraft] = useState("");
  const [ending, setEnding] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Duration timer
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // WebCam initialization
  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam(false);
      setCameraError("Camera access unavailable in this browser.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((e) => {
        if (cancelled) return;
        setCam(false);
        setCameraError(
          e?.name === "NotAllowedError"
            ? "Camera/microphone permission was denied."
            : "Could not access local media device."
        );
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleMic = () => {
    setMic((v) => !v);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !mic));
  };

  const toggleCam = () => {
    setCam((v) => !v);
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !cam));
  };

  const toggleScreenShare = async () => {
    if (sharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) return;
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (screenRef.current) screenRef.current.srcObject = stream;
        setSharing(true);
        if (stream.getVideoTracks()[0]) {
          stream.getVideoTracks()[0]!.onended = () => setSharing(false);
        }
      } catch {
        setSharing(false);
      }
    }
  };

  const timeStr = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const addEntry = (textToAdd?: string) => {
    const val = (textToAdd || draft).trim();
    if (!val) return;
    setEntries((prev) => [...prev, { speaker, text: val, time: timeStr }]);
    if (!textToAdd) setDraft("");
  };

  const addQuickChip = (chipText: string) => {
    addEntry(chipText);
  };

  const handleFinishCall = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    const fullTranscript = entries.map((e) => `${e.speaker}: ${e.text}`).join("\n");
    onFinish(fullTranscript.trim() || "Me: Discussed deal parameters, pricing and delivery terms.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)", gap: 14 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button
          className="back-link"
          onClick={() => go("new")}
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
          <ArrowLeft size={14} /> Back to Options
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(218, 54, 51, 0.12)",
              color: "var(--danger-text)",
              border: "1px solid rgba(218, 54, 51, 0.3)",
              padding: "3px 10px",
              borderRadius: 99,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--danger)",
                boxShadow: "0 0 8px rgba(218, 54, 51, 0.8)",
              }}
            />
            LIVE SESSION · {timeStr}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--muted-foreground)",
              background: "var(--navy-soft)",
              padding: "3px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
            }}
          >
            <Lock size={12} className="text-primary" />
            End-to-End Encrypted
          </span>
        </div>
      </div>

      {/* Main Screen Split: Left Participant Video & Controls, Right AI HUD */}
      <div
        className="meeting"
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
        }}
      >
        {/* Left Side: Video Monitor & Hardware Controls */}
        <div
          className="meeting-main"
          style={{
            display: "flex",
            flexDirection: "column",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 16,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              fontSize: 12,
              color: "var(--muted-foreground)",
            }}
          >
            <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
              {cameraError || (sharing ? "Screen Sharing Stream Active" : "Local HD Video & Audio Stream")}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              2 Participants Active
            </span>
          </div>

          {/* Video Grid Tiles */}
          <div
            className="video-grid"
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: sharing ? "2fr 1fr" : "1fr 1fr",
              gap: 12,
              minHeight: 0,
            }}
          >
            {/* Tile 1: Screen Share (if active) */}
            {sharing && (
              <div
                style={{
                  background: "#000000",
                  borderRadius: 12,
                  overflow: "hidden",
                  position: "relative",
                  border: "1px solid var(--border)",
                }}
              >
                <video
                  ref={screenRef}
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    background: "rgba(0,0,0,0.75)",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  Your Screen Share
                </span>
              </div>
            )}

            {/* Tile 2: Host Video View */}
            <div
              style={{
                position: "relative",
                background: "var(--navy)",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--border)",
              }}
            >
              {cam ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: "100%",
                    height: "100%",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--muted-foreground)",
                    background: "var(--navy-soft)",
                  }}
                >
                  YOU (CAMERA OFF)
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0,0,0,0.75)",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {mic ? (
                  <Volume2 size={13} style={{ color: "var(--success-text)" }} />
                ) : (
                  <MicOff size={13} style={{ color: "var(--danger-text)" }} />
                )}
                <span>You (Host)</span>
              </div>
            </div>

            {/* Tile 3: Counterparty Virtual Video Tile */}
            <div
              style={{
                position: "relative",
                background: "var(--navy)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--primary), #38BDF8)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  CP
                </div>
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    background: "var(--success-text)",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid var(--navy)",
                  }}
                />
              </div>
              <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                Counterparty Representative
              </p>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Audio Connected · Active
              </span>
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0,0,0,0.75)",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <Volume2 size={13} style={{ color: "var(--success-text)" }} />
                <span>Counterparty</span>
              </div>
            </div>
          </div>

          {/* Bottom Meeting Controls Bar */}
          <div
            style={{
              marginTop: 14,
              padding: "10px 16px",
              background: "var(--navy-soft)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <IconButton
              label={mic ? "Mute Microphone" : "Unmute Microphone"}
              onClick={toggleMic}
              style={{
                background: mic ? "var(--card)" : "var(--danger)",
                color: mic ? "var(--foreground)" : "#fff",
              }}
            >
              {mic ? <Mic size={17} /> : <MicOff size={17} />}
            </IconButton>

            <IconButton
              label={cam ? "Turn Camera Off" : "Turn Camera On"}
              onClick={toggleCam}
              style={{
                background: cam ? "var(--card)" : "var(--danger)",
                color: cam ? "var(--foreground)" : "#fff",
              }}
            >
              {cam ? <Camera size={17} /> : <VideoOff size={17} />}
            </IconButton>

            <IconButton
              label={sharing ? "Stop Screen Share" : "Share Screen"}
              onClick={toggleScreenShare}
              style={{
                background: sharing ? "var(--primary)" : "var(--card)",
                color: sharing ? "#fff" : "var(--foreground)",
              }}
            >
              <Monitor size={17} />
            </IconButton>

            <IconButton
              label={captions ? "Turn Off Live Captions" : "Turn On Live Captions"}
              onClick={() => setCaptions(!captions)}
              style={{
                background: captions ? "var(--accent)" : "var(--card)",
                color: captions ? "var(--accent-foreground)" : "var(--foreground)",
              }}
            >
              <MessageSquare size={17} />
            </IconButton>

            <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 6px" }} />

            <Button
              variant="danger"
              onClick={() => setEnding(true)}
              style={{ borderRadius: 99, padding: "0 18px", fontWeight: 700 }}
            >
              <Square size={14} fill="currentColor" /> End Call &amp; Process Deal
            </Button>
          </div>
        </div>

        {/* Right Side: LIVE INTELLIGENCE HUD */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 18,
            minHeight: 0,
          }}
        >
          {/* Head */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(47, 129, 247, 0.12)",
                color: "var(--primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Sparkles size={16} />
            </span>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                LIVE INTELLIGENCE HUD
              </h3>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Continuous deal term extraction
              </span>
            </div>
          </div>

          {/* Detected Commercial Terms HUD Badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
              Active Contract Signals
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <CommercialTermPill label="Price" value="₹800/unit" status="confirmed" />
              <CommercialTermPill label="Qty" value="500 units" status="confirmed" />
              <CommercialTermPill label="Terms" value="NET 30" status="confirmed" />
              <CommercialTermPill label="Warranty" value="12 mo" status="confirmed" />
            </div>
          </div>

          {/* Quick-insert Terms Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            <button
              onClick={() => addQuickChip("Agreed on 500 units at ₹800/unit")}
              style={{
                border: "1px solid var(--border)",
                background: "var(--navy-soft)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 10,
                color: "var(--foreground)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              + 500 units @ ₹800
            </button>
            <button
              onClick={() => addQuickChip("Payment Terms: NET 30 Days after delivery")}
              style={{
                border: "1px solid var(--border)",
                background: "var(--navy-soft)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 10,
                color: "var(--foreground)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              + NET 30 Days
            </button>
            <button
              onClick={() => addQuickChip("Warranty: 12 months full replacement SLA")}
              style={{
                border: "1px solid var(--border)",
                background: "var(--navy-soft)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 10,
                color: "var(--foreground)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              + 1yr Warranty SLA
            </button>
          </div>

          {/* Live Transcript Stream */}
          <div
            className="transcript-live"
            style={{
              flex: 1,
              minHeight: 120,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingRight: 4,
            }}
          >
            {entries.map((e, i) => (
              <div
                key={i}
                style={{
                  background: "var(--navy-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <b style={{ fontSize: 11, color: e.speaker === "Me" ? "var(--primary)" : "#38BDF8" }}>
                    {e.speaker}
                  </b>
                  <small style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                    {e.time}
                  </small>
                </div>
                <p style={{ fontSize: 12, margin: 0, color: "var(--foreground)", lineHeight: 1.45 }}>
                  {e.text}
                </p>
              </div>
            ))}
          </div>

          {/* Live Input Controls */}
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <select
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              style={{
                height: 32,
                fontSize: 11,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--navy-soft)",
                color: "var(--foreground)",
                padding: "0 8px",
              }}
            >
              <option value="Me">Me (Buyer)</option>
              <option value="Counterparty">Counterparty (Seller)</option>
            </select>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  addEntry();
                }
              }}
              placeholder="Record agreed term... (Ctrl+Enter to post)"
              rows={2}
              style={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--navy-soft)",
                color: "var(--foreground)",
                padding: 8,
                resize: "none",
              }}
            />
            <Button
              variant="secondary"
              onClick={() => addEntry()}
              style={{ width: "100%", justifyContent: "center", fontSize: 12, height: 34 }}
            >
              <Plus size={14} /> Add Note Line
            </Button>
          </div>
        </aside>

        {/* End Call Modal */}
        {ending && (
          <Modal
            title="End Deal Call & Process Agreement?"
            description="Armor will analyze all notes recorded during this meeting and convert them into structured deal terms."
            onClose={() => setEnding(false)}
          >
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <Button variant="secondary" onClick={() => setEnding(false)}>
                Resume Call
              </Button>
              <Button variant="danger" onClick={handleFinishCall}>
                <CheckCircle2 size={16} /> Finish Call &amp; Run Analysis
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
