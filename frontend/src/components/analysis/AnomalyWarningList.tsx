import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Conflict } from "@/types/armor";

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const isAnomaly = conflict.topic?.includes("Unrealistic") || conflict.topic?.includes("Anomalous");

  const cardStyle = isAnomaly
    ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-100"
    : "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-100";

  return (
    <div className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${cardStyle}`}>
      <div className="flex items-center justify-between gap-2">
        <b className={`text-xs font-bold ${isAnomaly ? "text-rose-700 dark:text-rose-300" : "text-amber-800 dark:text-amber-300"}`}>
          {conflict.topic}
        </b>
        <span
          className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
            conflict.severity === "high"
              ? "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
              : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
          }`}
        >
          {conflict.severity} severity
        </span>
      </div>
      <p className="text-[11px] opacity-85">
        <b className="font-semibold">Statement:</b> {conflict.earlier_statement}
      </p>
      {conflict.later_statement && (
        <p className="text-[11px] opacity-85">
          <b className="font-semibold">Comparison:</b> {conflict.later_statement}
        </p>
      )}
      <p className="text-xs pt-1 font-medium leading-relaxed">
        <b>Sanity Analysis:</b> {conflict.resolution}
      </p>
    </div>
  );
}

export function AnomalyWarningList({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) {
    return (
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-3">
        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            CLEAN TRANSCRIPT
          </span>
          <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">No contradictions detected</h3>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">Armor didn't find any conflicting numbers or terms in this conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200/90 dark:border-amber-900/50 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" size={20} />
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
            CONFIRMATION REQUIRED
          </span>
          <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
            {conflicts.length} contradiction{conflicts.length > 1 ? "s" : ""} detected in the transcript
          </h3>
        </div>
      </div>
      <div className="grid gap-2.5">
        {conflicts.map((c, i) => (
          <ConflictCard key={i} conflict={c} />
        ))}
      </div>
    </div>
  );
}
