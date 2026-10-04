import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  Info,
  Sparkles,
  Mic,
  Play,
  Pause,
  Square,
  FileText,
  RefreshCcw,
  CheckCircle2,
  BrainCircuit,
  Handshake,
  RotateCcw,
  Download,
  Volume2,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button, Card } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { VoiceFabricVisualizer } from "../shared/VoiceFabricVisualizer";
import { AudioPlayer } from "../shared/AudioPlayer";
import { transcribeAudio } from "@/lib/api";
import type { HealthStatus, Screen } from "@/types/armor";

const AUDIO_MIME_CANDIDATES: { mime: string; ext: string }[] = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  { mime: "audio/mp4", ext: "m4a" },
];

function pickRecorderMime(): { mime: string; ext: string } {
  if (typeof MediaRecorder !== "undefined") {
    for (const c of AUDIO_MIME_CANDIDATES) {
      if (MediaRecorder.isTypeSupported?.(c.mime)) return c;
    }
  }
  return { mime: "", ext: "webm" };
}

export function Recording({
  go,
  onTranscribed,
  health,
  conn,
  onRetry,
}: {
  go: (s: Screen) => void;
  onTranscribed: (transcript: string) => void;
  health: HealthStatus | null;
  conn: string;
  onRetry: () => void;
}) {
  const [state, setState] = useState<"ready" | "recording" | "paused" | "review" | "uploading">("ready");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedExt, setRecordedExt] = useState("webm");
  const [sttNotice, setSttNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Clean up any active tracks and timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const upload = async (blob: Blob, filename: string) => {
    setState("uploading");
    setError(null);
    setSttNotice(null);
    try {
      const result = await transcribeAudio(blob, filename);
      onTranscribed(result.transcript || "");
    } catch (e: any) {
      setError(e.message || "Transcription failed. Please try again.");
      setState("review");
    }
  };

  const start = async () => {
    setError(null);
    setSttNotice(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser environment.");
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = audioStream;
      setStream(audioStream);
      chunksRef.current = [];

      const { mime, ext } = pickRecorderMime();
      setRecordedExt(ext);

      const recorder = new MediaRecorder(audioStream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mime || "audio/webm",
        });
        setRecordedBlob(finalBlob);
        setState("review");

        // Release mic hardware
        audioStream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStream(null);
      };

      // 250ms timeslice to ensure continuous chunk buffering
      recorder.start(250);
      setState("recording");
      setSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (e: any) {
      console.error("Recording start error:", e);
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setError("Microphone access was denied. Please allow microphone permissions in your browser to record.");
      } else if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
        setError("No microphone device was detected on your system.");
      } else {
        setError(`Microphone initialization error: ${e.message || e}`);
      }
    }
  };

  const pauseResume = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;

    if (state === "paused") {
      rec.resume();
      setState("recording");
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (state === "recording") {
      rec.pause();
      setState("paused");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setRecordedBlob(null);
    setSeconds(0);
    setError(null);
    setSttNotice(null);
    setState("ready");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      setRecordedBlob(file);
      upload(file, file.name);
    }
  };

  const handleAnalyzeClick = () => {
    if (!recordedBlob) return;

    // Check if STT is configured
    if (!health?.stt_configured) {
      setSttNotice(
        "Notice: Speech-to-text API is unconfigured on the server (add ASSEMBLYAI_API_KEY to backend/.env). You can download the recording or proceed to the Transcript Workspace to edit or paste notes."
      );
      return;
    }

    upload(recordedBlob, `meeting-recording-${Date.now()}.${recordedExt}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      {/* Editorial Header */}
      <EditorialHeading
        kicker="ACOUSTIC CAPTURE · OFFLINE MEETING"
        title="Capture the agreement in the room."
        subtitle="Place your device between negotiation participants. ARMOR records the conversation, analyzes the acoustic stream, and extracts commercial terms for review."
        actions={
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
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "2px 0" }}>
                Armor Server is Offline
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                Audio transcription requires the Flask API at http://127.0.0.1:5000 to process uploads.
              </p>
            </div>
            <Button variant="secondary" onClick={onRetry}>
              <RefreshCcw size={14} /> Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Main Console Card */}
      <Card
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* ── STATE 1: UPLOADING & TRANSCRIBING ────────────────────────────── */}
        {state === "uploading" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, maxWidth: 500, padding: "20px 0" }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38BDF8",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 0 30px rgba(56, 189, 248, 0.25)",
              }}
            >
              <Sparkles size={32} className="animate-spin" />
            </div>

            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "var(--foreground)" }}>
                Transcribing &amp; Diarizing Audio
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.55 }}>
                ARMOR's speech-to-text neural model is processing acoustic channels, identifying speaker boundaries, and preparing conversational text.
              </p>
            </div>

            {/* Pipeline progress steps */}
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 8,
                background: "var(--navy-soft)",
                padding: 18,
                borderRadius: 12,
                border: "1px solid var(--border)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--success-text)" }}>
                <CheckCircle2 size={16} />
                <span>Audio capture uploaded successfully</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--primary)" }}>
                <RefreshCcw size={16} className="animate-spin" />
                <span style={{ fontWeight: 600 }}>Transcribing dialogue and separating speakers…</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, opacity: 0.45 }}>
                <BrainCircuit size={16} />
                <span>Extract commercial entities and covenant terms</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, opacity: 0.45 }}>
                <Handshake size={16} />
                <span>Format verified bilateral deal record</span>
              </div>
            </div>
          </div>
        ) : state === "review" && recordedBlob ? (
          /* ── STATE 2: RECORDING REVIEW & PLAYBACK ───────────────────────── */
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: "10px 0" }}>
            {/* Header Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--success)",
                  boxShadow: "0 0 10px rgba(31, 136, 61, 0.4)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  color: "var(--success-text)",
                }}
              >
                RECORDING COMPLETE
              </span>
            </div>

            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px", color: "var(--foreground)" }}>
                Meeting Audio Captured
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 520, margin: "0 auto" }}>
                Your meeting dialogue is preserved in memory. You can listen to the recording, verify clarity, and send it into the ARMOR analysis pipeline.
              </p>
            </div>

            {/* Custom Audio Player */}
            <AudioPlayer
              audioBlob={recordedBlob}
              durationSeconds={seconds}
              filename={`meeting-recording-${Date.now()}.${recordedExt}`}
            />

            {/* Notice if STT is unconfigured on server */}
            {sttNotice && (
              <div
                style={{
                  width: "100%",
                  maxWidth: 680,
                  padding: "14px 18px",
                  borderRadius: 10,
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  textAlign: "left",
                  fontSize: 12,
                  color: "var(--warning-text)",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Info size={18} style={{ color: "var(--warning-text)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Speech-to-Text Setup Notice</div>
                  <div>{sttNotice}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <Button
                      onClick={() => go("transcript")}
                      style={{ height: 32, fontSize: 12, padding: "0 14px" }}
                    >
                      Open Transcript Workspace <ChevronRight size={13} />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => upload(recordedBlob, `meeting.${recordedExt}`)}
                      style={{ height: 32, fontSize: 12, padding: "0 14px" }}
                    >
                      Attempt Server STT Anyway
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <Button
                variant="secondary"
                onClick={resetRecording}
                style={{ height: 44, padding: "0 20px", fontSize: 13 }}
              >
                <RotateCcw size={15} /> Record New Take
              </Button>

              <Button
                onClick={handleAnalyzeClick}
                style={{
                  height: 44,
                  padding: "0 28px",
                  fontSize: 14,
                  background: "linear-gradient(135deg, #0284C7, #0EA5E9)",
                  borderColor: "rgba(56, 189, 248, 0.5)",
                }}
              >
                <Sparkles size={16} /> Analyze Conversation
              </Button>
            </div>
          </div>
        ) : (
          /* ── STATE 3: LIVE ACTIVE RECORDING OR READY ─────────────────────── */
          <>
            {/* Status Header Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                background: "var(--navy-soft)",
                padding: "6px 14px",
                borderRadius: 9999,
                border: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    state === "recording"
                      ? "var(--danger)"
                      : state === "paused"
                        ? "var(--warning)"
                        : "var(--primary)",
                  boxShadow:
                    state === "recording"
                      ? "0 0 10px rgba(239, 68, 68, 0.5)"
                      : state === "paused"
                        ? "0 0 8px rgba(245, 158, 11, 0.5)"
                        : "none",
                  animation: state === "recording" ? "pulse 1.8s infinite" : "none",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  color:
                    state === "recording"
                      ? "var(--danger-text)"
                      : state === "paused"
                        ? "var(--warning-text)"
                        : "var(--primary)",
                }}
              >
                {state === "ready"
                  ? "READY TO CAPTURE"
                  : state === "paused"
                    ? "RECORDING PAUSED"
                    : "ACTIVE RECORDING"}
              </span>
            </div>

            {/* Digital Timer (00:00:00) */}
            <div
              style={{
                fontSize: "clamp(42px, 5.5vw, 56px)",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "var(--foreground)",
                letterSpacing: "-0.02em",
                marginBottom: 16,
              }}
            >
              {formatTimer(seconds)}
            </div>

            {/* Central Live Voice Fabric Waveform & Level Meter */}
            <div style={{ width: "100%", margin: "8px 0 24px" }}>
              <VoiceFabricVisualizer
                stream={stream}
                isRecording={state === "recording"}
                isPaused={state === "paused"}
                height={220}
              />
            </div>

            <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 480, margin: "0 0 24px", lineHeight: 1.55 }}>
              {state === "ready"
                ? "Position this device centrally between all participants in the meeting room."
                : "Audio is streaming directly to memory. Pause whenever needed, or stop recording when terms have been discussed."}
            </p>

            {/* Recording Controls */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {state === "ready" ? (
                <Button
                  onClick={start}
                  style={{
                    height: 46,
                    padding: "0 28px",
                    fontSize: 14,
                    background: "var(--primary)",
                    border: "1px solid var(--border)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  <Mic size={18} /> Start Recording
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={pauseResume}
                    style={{ height: 44, padding: "0 22px", fontSize: 13 }}
                  >
                    {state === "paused" ? <Play size={16} /> : <Pause size={16} />}
                    {state === "paused" ? "Resume Capture" : "Pause"}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={stop}
                    style={{ height: 44, padding: "0 22px", fontSize: 13 }}
                  >
                    <Square size={16} /> Stop Recording
                  </Button>
                </>
              )}
            </div>

            {/* Alternative File Upload */}
            {state === "ready" && (
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)", width: "100%", maxWidth: 440 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg,.mp4,.mpeg,.mpga"
                  style={{ display: "none" }}
                  onChange={handleFile}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  style={{ width: "100%", justifyContent: "center", fontSize: 12, height: 36 }}
                >
                  <FileText size={15} /> Upload existing audio recording instead
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div
                style={{
                  color: "#F87171",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontSize: 12,
                  marginTop: 18,
                  maxWidth: 540,
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
