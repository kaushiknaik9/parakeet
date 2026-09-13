import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FileAudio, FileUp, Loader2, Mic, PenLine, Sparkles, Wand2 } from "lucide-react";
import { getSampleTranscript, transcribeAudio } from "../api/dealapi";
import AudioRecorder from "./AudioRecorder";

const TABS = [
  { id: "record", label: "Record", icon: Mic },
  { id: "paste", label: "Paste / Upload", icon: PenLine },
];

const TranscriptInput = ({ onAnalyze, isAnalyzing, error }) => {
  const [tab, setTab] = useState("record");
  const [transcript, setTranscript] = useState("");
  const [dealName, setDealName] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState(null);
  const [transcribeMeta, setTranscribeMeta] = useState(null);
  const fileRef = useRef(null);
  const audioFileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setTranscript(text);
    setTranscribeMeta(null);
    if (!dealName) setDealName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleAudioFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!dealName) setDealName(file.name.replace(/\.[^/.]+$/, ""));
    await handleRecordingComplete(file, file.name);
  };

  const loadSample = async () => {
    setIsLoadingSample(true);
    try {
      const { transcript: sample } = await getSampleTranscript();
      setTranscript(sample);
      setTranscribeMeta(null);
      setDealName("Earbuds Bulk Order — Sample");
      setTab("paste");
    } catch {
      // ignore — sample is optional convenience
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleRecordingComplete = async (blob, filename = "recording.webm") => {
    setTranscribeError(null);
    setIsTranscribing(true);
    try {
      const result = await transcribeAudio(blob, filename);
      setTranscript(result.transcript || "");
      setTranscribeMeta(result);
      setTab("paste"); // let them review/edit the diarized transcript before analyzing
    } catch (err) {
      setTranscribeError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const canSubmit = transcript.trim().length >= 20 && !isAnalyzing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      className="w-full max-w-4xl mx-auto min-w-0"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--glass-base)]/10 text-[var(--text-main)] mb-6">
          <Mic size={26} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-main)] tracking-tight mb-3">
          Turn a deal conversation into a deal
        </h1>
        <p className="text-[var(--text-muted)] max-w-xl mx-auto">
          Record the call, or paste/upload a transcript. Armour diarizes and transcribes the
          audio, then extracts the terms, drafts the agreement, builds the calculator, and
          writes the confirmation email.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 md:p-8 min-w-0">
        <input
          type="text"
          value={dealName}
          onChange={(e) => setDealName(e.target.value)}
          placeholder="Deal name (optional) — e.g. Earbuds Bulk Order"
          className="w-full mb-5 px-4 py-3 bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl text-sm text-[var(--text-main)] placeholder-[var(--text-main)]/30 focus:outline-none focus:border-[var(--text-main)]/30"
        />

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-5 border border-[var(--glass-border)] rounded-xl p-1 w-fit mx-auto sm:mx-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--text-main)] text-[var(--bg-main)]"
                    : "text-[var(--text-main)] opacity-60 hover:opacity-100"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Record tab ───────────────────────────────────────────────── */}
        {tab === "record" && (
          <div>
            {isTranscribing ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 size={28} className="animate-spin text-[var(--text-main)]" />
                <p className="text-sm text-[var(--text-main)] font-semibold">
                  Transcribing &amp; diarizing…
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Long recordings are fully supported — this can take a few minutes for calls over 20-30 minutes.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={isAnalyzing} />
                <div className="flex items-center gap-3 w-full max-w-xs">
                  <span className="flex-1 h-px bg-[var(--glass-border)]" />
                  <span className="text-[10px] font-bold text-[var(--text-main)] opacity-40 uppercase tracking-widest">or</span>
                  <span className="flex-1 h-px bg-[var(--glass-border)]" />
                </div>
                <input
                  ref={audioFileRef}
                  type="file"
                  accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg,.mp4,.mpeg,.mpga"
                  className="hidden"
                  onChange={handleAudioFile}
                />
                <button
                  onClick={() => audioFileRef.current?.click()}
                  disabled={isAnalyzing}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-base)]/10 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileAudio size={16} />
                  Upload a recorded call (any length)
                </button>
              </div>
            )}
            {transcribeError && (
              <div className="flex items-start gap-2 mt-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-500 text-xs break-words">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {transcribeError}
              </div>
            )}
          </div>
        )}

        {/* ── Paste / Upload tab ──────────────────────────────────────── */}
        {tab === "paste" && (
          <div className="min-w-0">
            {transcribeMeta && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs">
                Transcribed via {transcribeMeta.provider}
                {transcribeMeta.language ? ` · detected language: ${transcribeMeta.language}` : ""}
                {transcribeMeta.diarized === false ? " · speaker labels not available for this provider, edit below" : ""}
                — review and edit before analyzing.
              </div>
            )}
            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setTranscribeMeta(null);
              }}
              placeholder={
                "Buyer: Let's finalize the order — 500 units at ₹800 each...\nSeller: That's ₹4,00,000 total. I'll need 30% upfront...\n\nPaste your speaker-labelled transcript here, or record it in the Record tab."
              }
              rows={12}
              className="w-full min-w-0 bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-2xl p-4 text-sm text-[var(--text-main)] placeholder-[var(--text-main)]/25 focus:outline-none focus:border-[var(--text-main)]/30 leading-relaxed font-mono resize-y max-h-[50vh] overflow-y-auto custom-scrollbar"
            />

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
              <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-base)]/10 transition-colors text-sm font-medium"
              >
                <FileUp size={16} />
                Upload .txt
              </button>

              <button
                onClick={loadSample}
                disabled={isLoadingSample}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-base)]/10 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isLoadingSample ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Try a sample deal
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mt-4 font-mono text-center break-words">{error}</p>}

        <div className="flex justify-center sm:justify-end mt-6">
          <motion.button
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            onClick={() => canSubmit && onAnalyze(transcript, dealName)}
            disabled={!canSubmit}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-bold shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Analyzing deal…
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Analyze Deal
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default TranscriptInput;
