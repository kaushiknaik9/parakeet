import { ArrowLeft, Video, Mic, ArrowRight, AlertTriangle, Info } from "lucide-react";
import { Button, Card } from "../shared/armor-ui";
import { getSampleTranscript } from "@/lib/api";
import { transcriptToLines } from "@/lib/format";
import type { HealthStatus, Screen } from "@/types/armor";

export function NewConversation({ go, health, conn, onRetry, onUseSample }: {
  go: (s: Screen) => void; health: HealthStatus | null; conn: string; onRetry: () => void; onUseSample: () => void;
}) {
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
      <div className="choice-grid">
        <button className="choice" onClick={() => go("meeting")}>
          <span className="choice__visual"><Video size={38} /><i /><i /></span>
          <div><h3>Live Notes</h3><p>Take structured notes during a call you're already on (video/audio stays in your usual meeting app — this just helps you capture the terms).</p><span>Start Live Notes <ArrowRight size={17} /></span></div>
        </button>
        <button className="choice" onClick={() => go("recording")} disabled={conn === "offline" || (conn === "online" && !health?.stt_configured)}>
          <span className="choice__visual choice__visual--mic"><Mic size={38} /><i /><i /></span>
          <div><h3>Offline Recording</h3><p>Record an in-person business conversation from your microphone and have Armor transcribe it.</p><span>Start Recording <ArrowRight size={17} /></span></div>
        </button>
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
