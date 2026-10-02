import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Mic, MicOff, Camera, VideoOff, Square, Plus, Sparkles, ShieldCheck,
  Monitor, MessageSquare, Volume2, UserCheck, Lock, CheckCircle2
} from "lucide-react";
import { Button, IconButton, Modal } from "../shared/armor-ui";
import type { Screen } from "@/types/armor";

export function Meeting({ go, onFinish }: { go: (s: Screen) => void; onFinish: (transcript: string) => void }) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [entries, setEntries] = useState<{ speaker: string; text: string; time: string }[]>([
    { speaker: "Me", text: "Meeting started. Discussing commercial agreement terms.", time: "00:01" }
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
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
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
        stream.getVideoTracks()[0].onended = () => setSharing(false);
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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", gap: 12 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button className="back-link" onClick={() => go("new")}>
          <ArrowLeft size={14} /> Back to New Deal Options
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="live-dot" />
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
            LIVE MEET ROOM · {timeStr}
          </span>
          <span className="secure-pill" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", fontSize: 10 }}>
            <Lock size={11} /> End-to-End Deal Encrypted
          </span>
        </div>
      </div>

      {/* Main Google Meet Grid Shell */}
      <div className="meeting" style={{ flex: 1, minHeight: 0 }}>
        <div className="meeting-main">
          <div className="meeting-meta">
            <span>{cameraError || (sharing ? "Screen Sharing Active" : "Local HD Video & Audio Stream")}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>2 Participants connected</span>
          </div>

          {/* Video Grid (Google Meet 2-Tile or Screen Share layout) */}
          <div className="video-grid" style={{ display: "grid", gridTemplateColumns: sharing ? "2fr 1fr" : "1fr 1fr", gap: 12, height: "calc(100% - 70px)" }}>
            {/* Tile 1: Screen Share (if active) or Primary Self Video */}
            {sharing ? (
              <div className="video-tile video-tile--main" style={{ background: "#000", position: "relative" }}>
                <video ref={screenRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                <span style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.7)", padding: "4px 8px", borderRadius: 4, fontSize: 11 }}>
                  Your Screen Share
                </span>
              </div>
            ) : null}

            {/* Tile 2: Self Camera View */}
            <div className="video-tile video-tile--main" style={{ position: "relative", background: "var(--card)" }}>
              {cam ? (
                <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
              ) : (
                <div className="avatar-xl" style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", fontSize: 24, fontWeight: 800, background: "var(--secondary)" }}>
                  YOU
                </div>
              )}
              <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                {mic ? <Volume2 size={13} style={{ color: "var(--success-text)" }} /> : <MicOff size={13} style={{ color: "var(--danger-text)" }} />}
                <span>You (Host)</span>
              </div>
            </div>

            {/* Tile 3: Counterparty Virtual Video Tile */}
            <div className="video-tile" style={{ position: "relative", background: "var(--navy)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--primary)", display: "grid", placeItems: "center", color: "#fff", fontSize: 22, fontWeight: 800 }}>
                  CP
                </div>
                <span style={{ position: "absolute", bottom: -2, right: -2, background: "var(--success)", width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--navy)" }} />
              </div>
              <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>Counterparty Representative</p>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Vertex Client · Active Audio</span>
              <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                <Volume2 size={13} style={{ color: "var(--success-text)" }} />
                <span>Counterparty</span>
              </div>
            </div>
          </div>

          {/* Google Meet Bottom Controls Bar */}
          <div className="meeting-controls" style={{ marginTop: 12, padding: "8px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <IconButton label={mic ? "Mute Microphone" : "Unmute Microphone"} onClick={toggleMic} style={{ background: mic ? "var(--secondary)" : "var(--danger)", color: mic ? "var(--foreground)" : "#fff" }}>
              {mic ? <Mic size={18} /> : <MicOff size={18} />}
            </IconButton>

            <IconButton label={cam ? "Turn Camera Off" : "Turn Camera On"} onClick={toggleCam} style={{ background: cam ? "var(--secondary)" : "var(--danger)", color: cam ? "var(--foreground)" : "#fff" }}>
              {cam ? <Camera size={18} /> : <VideoOff size={18} />}
            </IconButton>

            <IconButton label={sharing ? "Stop Screen Share" : "Share Screen"} onClick={toggleScreenShare} style={{ background: sharing ? "var(--primary)" : "var(--secondary)", color: sharing ? "#fff" : "var(--foreground)" }}>
              <Monitor size={18} />
            </IconButton>

            <IconButton label={captions ? "Turn Off Live Captions" : "Turn On Live Captions"} onClick={() => setCaptions(!captions)} style={{ background: captions ? "var(--accent)" : "var(--secondary)", color: captions ? "var(--accent-foreground)" : "var(--foreground)" }}>
              <MessageSquare size={18} />
            </IconButton>

            <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />

            <Button variant="danger" onClick={() => setEnding(true)} style={{ borderRadius: 99, padding: "0 18px", fontWeight: 700 }}>
              <Square size={15} fill="currentColor" /> End Call & Process Deal
            </Button>
          </div>
        </div>

        {/* Right Side Real-Time AI Deal Notes Sidebar */}
        <aside className="ai-panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="ai-panel__head">
            <span className="brand__mark"><Sparkles /></span>
            <div>
              <h3>REAL-TIME AGENT NOTES</h3>
              <span>Type agreed commercial terms live</span>
            </div>
          </div>

          <div className="ai-insight">
            <ShieldCheck size={17} />
            <div>
              <b>Notes construct the deal agreement</b>
              <span>Armor structures every note you record into financial clauses & risk scores.</span>
            </div>
          </div>

          {/* Quick term suggestion chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "6px 0 10px" }}>
            <button onClick={() => addQuickChip("Agreed on 500 units at ₹800/unit")} className="badge" style={{ cursor: "pointer" }}>+ 500 units @ ₹800</button>
            <button onClick={() => addQuickChip("Payment Terms: NET 30 Days after delivery")} className="badge" style={{ cursor: "pointer" }}>+ NET 30 Days</button>
            <button onClick={() => addQuickChip("Warranty: 12 months full replacement SLA")} className="badge" style={{ cursor: "pointer" }}>+ 1yr Warranty SLA</button>
          </div>

          {/* Live Transcript Stream */}
          <div className="transcript-live" style={{ flex: 1, minHeight: 140, overflowY: "auto" }}>
            {entries.map((e, i) => (
              <div className="live-line" key={i}>
                <span style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>{e.speaker}</b>
                  <small style={{ fontSize: 9, opacity: 0.7 }}>{e.time}</small>
                </span>
                <p>{e.text}</p>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="field__control" style={{ height: 34, fontSize: 11 }}>
                <option value="Me">Me (Buyer)</option>
                <option value="Counterparty">Counterparty (Seller)</option>
              </select>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addEntry(); } }}
              placeholder="e.g. Counterparty agreed to deliver by 15th October with 5% late penalty (Ctrl+Enter to post)"
              rows={2}
              className="large-input"
              style={{ fontSize: 12 }}
            />
            <Button variant="secondary" onClick={() => addEntry()} style={{ width: "100%", justifyContent: "center" }}>
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
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setEnding(false)}>
                Resume Call
              </Button>
              <Button variant="danger" onClick={handleFinishCall}>
                <CheckCircle2 size={16} /> Finish Call & Run Analysis
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
