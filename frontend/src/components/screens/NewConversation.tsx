import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Video, Mic, ArrowRight, AlertTriangle, Info, Square } from "lucide-react";
import { Button, Card } from "../shared/armor-ui";
import { getSampleTranscript, transcribeAudio } from "@/lib/api";
import { transcriptToLines } from "@/lib/format";
import type { HealthStatus, Screen } from "@/types/armor";
import { createGMeetAudioRecorder, DualAudioRecorder } from "@/utils/gmeetAudioRecorder";

export function NewConversation({ go, health, conn, onRetry, onUseSample, onTranscribed }: {
  go: (s: Screen) => void; health: HealthStatus | null; conn: string; onRetry: () => void; onUseSample: () => void;
  onTranscribed?: (text: string) => void;
}) {
  const [isGMeetRecording, setIsGMeetRecording] = useState(false);
  const [gmeetUploading, setGmeetUploading] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [gmeetError, setGmeetError] = useState<string | null>(null);

  const recorderRef = useRef<DualAudioRecorder | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleStartGMeet = async () => {
    setGmeetError(null);
    try {
      const rec = await createGMeetAudioRecorder();
      recorderRef.current = rec;
      await rec.start();
      setIsGMeetRecording(true);
      setTimerSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      setGmeetError(e.message || "Could not start Google Meet dual-audio recording.");
    }
  };

  const handleStopGMeet = async () => {
    if (!recorderRef.current) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setGmeetUploading(true);
    try {
      const audioBlob = await recorderRef.current.stop();
      const res = await transcribeAudio(audioBlob, "gmeet-call.webm");
      if (onTranscribed) {
        onTranscribed(res.transcript || "");
      }
    } catch (e: any) {
      setGmeetError(e.message || "Failed to transcribe Google Meet audio.");
    } finally {
      setGmeetUploading(false);
      setIsGMeetRecording(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CREATE</span>
          <h2>Start an Electronics Deal Conversation</h2>
          <p>Paste or record your B2B electronics supply discussion (e.g., STM32 microcontrollers, PCB batch orders, component lead times, unit pricing).</p>
        </div>
      </div>
      <button className="back-link" onClick={() => go("dashboard")}><ArrowLeft size={14} /> Back</button>
      {conn === "offline" && (
        <Card className="alert-card" style={{ marginBottom: 20, borderColor: "var(--danger)" }}>
          <AlertTriangle style={{ color: "var(--danger)" }} />
          <div><span className="eyebrow">BACKEND UNREACHABLE</span><h3>Can't reach the Armor server</h3><p>No response from server. Make sure the Flask backend is running.</p></div>
          <Button variant="secondary" onClick={onRetry}>Retry</Button>
        </Card>
      )}
      {conn === "online" && health && !health.stt_configured && (
        <Card className="alert-card" style={{ marginBottom: 20 }}>
          <Info />
          <div><span className="eyebrow">RECORDING UNAVAILABLE</span><h3>No speech-to-text key configured</h3><p>The server has no API key set, so audio recording can't be transcribed right now. Paste a transcript instead, or try the sample deal below.</p></div>
        </Card>
      )}

      {gmeetError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 mb-4 flex items-center justify-between">
          <span>{gmeetError}</span>
          <button onClick={() => setGmeetError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}

      <div className="choice-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Google Meet Dual-Stream Action Card */}
        <Card className={`p-6 border transition-all flex flex-col justify-between ${isGMeetRecording ? "border-red-500 bg-red-500/5" : "border-border bg-card"}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-3 bg-red-500/10 text-red-500 rounded-xl inline-block">
                <Video size={24} />
              </span>
              {isGMeetRecording && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold rounded-full animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  REC {formatTimer(timerSeconds)}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Capture Live Google Meet</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Captures dual-stream audio (mic + meeting tab audio) directly in browser.
              </p>
            </div>
          </div>

          <div className="pt-4">
            {isGMeetRecording ? (
              <Button variant="danger" onClick={handleStopGMeet} loading={gmeetUploading} className="w-full justify-center">
                <Square size={16} /> Stop &amp; Generate PO
              </Button>
            ) : (
              <Button
                onClick={handleStartGMeet}
                disabled={conn === "offline" || (conn === "online" && !health?.stt_configured)}
                className="w-full justify-center bg-red-600 hover:bg-red-700 text-white border-none"
              >
                <Video size={16} /> Start Live Meet Recording
              </Button>
            )}
          </div>
        </Card>

        {/* Offline Microphone Recording Card */}
        <Card className="p-6 border border-border bg-card flex flex-col justify-between">
          <div className="space-y-3">
            <span className="p-3 bg-primary/10 text-primary rounded-xl inline-block">
              <Mic size={24} />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">Offline Recording</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Record an in-person business conversation from your microphone and have Armor transcribe it.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => go("recording")}
              disabled={conn === "offline" || (conn === "online" && !health?.stt_configured)}
              variant="secondary"
              className="w-full justify-center"
            >
              <Mic size={16} /> Start In-Person Recording
            </Button>
          </div>
        </Card>
      </div>

      <div className="workflow-strip">
        <span>Conversation</span><ArrowRight /><span>Deal understanding</span><ArrowRight /><span>Verified agreement</span><ArrowRight /><span>Tracked terms</span>
      </div>
      <p style={{ marginTop: 24, fontSize: 12, color: "var(--muted-foreground)" }}>
        Already have a transcript? <button className="text-action" style={{ display: "inline", border: 0, background: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }} onClick={() => go("transcript")}>Paste it directly</button>{" "}
        or <button style={{ display: "inline", border: 0, background: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }} onClick={onUseSample}>try a sample deal</button>.
      </p>
    </>
  );
}
