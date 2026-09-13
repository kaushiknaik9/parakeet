import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

const getRemaining = (target) => {
  if (!target) return null;
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { done: false, days, hours, minutes, seconds };
};

const Unit = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-16 md:w-20 rounded-2xl bg-[var(--glass-base)]/10 border border-[var(--glass-border)] py-3 text-2xl md:text-3xl font-bold text-[var(--text-main)] text-center tabular-nums">
      {pad(value)}
    </div>
    <span className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase">
      {label}
    </span>
  </div>
);

const DealCountdown = ({ extracted }) => {
  const initialDate = extracted?.deadlines?.[0]?.date || "";
  const [dateValue, setDateValue] = useState(initialDate);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setDateValue(extracted?.deadlines?.[0]?.date || "");
  }, [extracted]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = useMemo(() => {
    if (!dateValue) return null;
    const d = new Date(`${dateValue}T23:59:59`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateValue]);

  const remaining = useMemo(() => getRemaining(target), [target, now]);
  const label = extracted?.deadlines?.[0]?.label || extracted?.deadlines?.[0]?.raw_text;

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-7 min-w-0 flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-4 mb-6">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="opacity-60 text-[var(--text-main)]" />
          <h3 className="font-semibold text-[var(--text-main)]">Deadline Countdown</h3>
        </div>
        <input
          type="date"
          value={dateValue || ""}
          onChange={(e) => setDateValue(e.target.value)}
          className="bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {!target && (
          <p className="text-sm text-[var(--text-muted)] text-center max-w-xs">
            No deadline was captured from the transcript. Set one above to start the countdown.
          </p>
        )}

        {target && remaining && !remaining.done && (
          <>
            <div className="flex gap-2 md:gap-4">
              <Unit value={remaining.days} label="Days" />
              <Unit value={remaining.hours} label="Hrs" />
              <Unit value={remaining.minutes} label="Min" />
              <Unit value={remaining.seconds} label="Sec" />
            </div>
            {(label || dateValue) && (
              <p className="text-xs text-[var(--text-muted)] text-center mt-2 break-words px-2">
                Until {label ? `"${label}"` : "the deadline"} on {dateValue}
              </p>
            )}
          </>
        )}

        {target && remaining && remaining.done && (
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500 mb-1">Deadline passed</p>
            <p className="text-xs text-[var(--text-muted)]">
              {label ? `"${label}"` : "The agreed deadline"} was {dateValue}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealCountdown;
