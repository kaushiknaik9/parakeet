import { useEffect, useRef, useState } from "react";
import { ArrowLeft, AlertTriangle, Info, Sparkles, Mic, Play, Square, FileText, RefreshCcw } from "lucide-react";
import { Button, Card, IconButton } from "../shared/armor-ui";
import { transcribeAudio } from "@/lib/api";
import type { HealthStatus } from "@/types/armor";

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

import type { Screen } from "@/types/armor";

export function Recording({ go, onTranscribed, health, conn, onRetry }: {
  go: (s: Screen) => void; onTranscribed: (transcript: string) => void; health: HealthStatus | null; conn: string; onRetry: () => void;
}) {
  const [state, setState] = useState<"ready" | "recording" | "paused" | "uploading" | "error">("ready");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const extRef = useRef("webm");

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const upload = async (blob: Blob, filename: string) => {
    setState("uploading"); setError(null);
    try {
      const result = await transcribeAudio(blob, filename);
      onTranscribed(result.transcript || "");
    } catch (e: any) {
      setError(e.message); setState("ready");
    }
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setError("Microphone access isn't available in this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const { mime, ext } = pickRecorderMime();
      extRef.current = ext;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        upload(blob, `recording.${extRef.current}`);
      };
      recorder.start(); setState("recording"); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      setError(e?.name === "NotAllowedError" ? "Microphone permission was denied." : `Could not start recording: ${e.message || e}`);
    }
  };

  const pauseResume = () => {
    const rec = mediaRecorderRef.current; if (!rec) return;
    if (state === "paused") { rec.resume(); setState("recording"); }
    else { rec.pause(); setState("paused"); }
  };

  const stop = () => { if (timerRef.current) clearInterval(timerRef.current); mediaRecorderRef.current?.stop(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (file) upload(file, file.name);
  };

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OFFLINE CONVERSATION</span>
          <h2>Capture the agreement in the room</h2>
          <p>Armor will transcribe and diarize the recording, then let you review it before analysis.</p>
        </div>
      </div>
      <button className="back-link" onClick={() => go("new")}><ArrowLeft size={14} /> Back</button>
      {conn === "offline" && (
        <Card className="alert-card" style={{ marginBottom: 20, borderColor: "var(--danger)" }}>
          <AlertTriangle style={{ color: "var(--danger)" }} />
          <div><span className="eyebrow">BACKEND UNREACHABLE</span><h3>Can't reach the Armor server</h3><p>No response from server — recording and file upload need the backend running to transcribe audio.</p></div>
          <Button variant="secondary" onClick={onRetry}><RefreshCcw size={16} />Retry</Button>
        </Card>
      )}
      <Card className="recorder">
        {state === "uploading" ? (
          <>
            <span className="brand__mark brand__mark--large"><Sparkles /></span>
            <h2>Transcribing your recording</h2>
            <p>This can take a few minutes for longer calls — please keep this tab open.</p>
            <div className="processing-list"><div className="done"><span className="processing-ring" /><b>Uploading &amp; transcribing audio…</b></div></div>
          </>
        ) : (
          <>
            <div className={`mic-orbit ${state === "recording" ? "recording" : ""}`}><Mic size={42} /><i /><i /></div>
            <span className="recorder__status">{state === "ready" ? "READY" : state === "paused" ? "PAUSED" : "RECORDING"}</span>
            <div className="timer">{time}</div>
            <p>{state === "ready" ? "Place your device near the conversation participants." : "Audio is being captured on this device."}</p>
            <div className="recorder__buttons">
              {state === "ready" ? (
                <Button onClick={start} disabled={conn !== "online" || !health?.stt_configured}><Mic size={17} />Start Recording</Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={pauseResume}>{state === "paused" ? <Play size={17} /> : <Square size={17} />}{state === "paused" ? "Resume" : "Pause"}</Button>
                  <Button variant="danger" onClick={stop}><Square size={17} />Stop &amp; Process</Button>
                </>
              )}
            </div>
            <div style={{ marginTop: 18 }}>
              <input ref={fileRef} type="file" accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg,.mp4,.mpeg,.mpga" className="hidden" style={{ display: "none" }} onChange={handleFile} />
              <Button variant="secondary" onClick={() => fileRef.current?.click()}><FileText size={16} />Upload a recorded call instead</Button>
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12 }}>{error}</p>}
            {conn === "online" && !health?.stt_configured && <p style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 10 }}>No speech-to-text key is configured on the server, so live recording is disabled. You can still upload an existing audio file if a key is added later, or paste a transcript instead.</p>}
            {conn === "checking" && <p style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 10 }}>Checking connection to the backend…</p>}
          </>
        )}
      </Card>
    </>
  );
}
