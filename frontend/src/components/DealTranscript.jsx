import React, { useMemo, useState } from "react";
import { ChevronDown, MessageSquareText } from "lucide-react";

const SPEAKER_LINE = /^\s*([A-Za-z][A-Za-z0-9 _.-]{0,30}?)\s*:\s*(.+)$/;

const SPEAKER_COLORS = [
  "text-sky-400",
  "text-amber-400",
  "text-emerald-400",
  "text-fuchsia-400",
  "text-rose-400",
];

const DealTranscript = ({ transcript }) => {
  const [open, setOpen] = useState(false);

  const lines = useMemo(() => {
    const speakerOrder = [];
    return String(transcript || "")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((line, i) => {
        const m = SPEAKER_LINE.exec(line);
        if (!m) return { key: i, speaker: null, text: line };
        const speaker = m[1].trim();
        if (!speakerOrder.includes(speaker)) speakerOrder.push(speaker);
        const colorIdx = speakerOrder.indexOf(speaker) % SPEAKER_COLORS.length;
        return { key: i, speaker, text: m[2].trim(), color: SPEAKER_COLORS[colorIdx] };
      });
  }, [transcript]);

  return (
    <div className="glass-panel rounded-3xl min-w-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-[var(--text-main)]">
          <MessageSquareText size={18} className="opacity-60" />
          Full Transcript
          <span className="text-xs font-normal text-[var(--text-muted)]">({lines.length} lines)</span>
        </span>
        <ChevronDown
          size={18}
          className={`text-[var(--text-main)] opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar border-t border-[var(--glass-border)] p-5 md:p-6 space-y-3 min-w-0">
          {lines.map((l) => (
            <p key={l.key} className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {l.speaker && <span className={`font-bold ${l.color} mr-2`}>{l.speaker}:</span>}
              <span className="text-[var(--text-main)] opacity-85">{l.text}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealTranscript;
