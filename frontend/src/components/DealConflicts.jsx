import React from "react";
import { motion } from "framer-motion";
import { AlertOctagon, ArrowRight, ShieldCheck } from "lucide-react";

const SEVERITY_STYLES = {
  high: {
    border: "border-red-500/25",
    bg: "bg-red-500/5",
    tag: "bg-red-500/10 border-red-500/30 text-red-500",
  },
  medium: {
    border: "border-amber-500/25",
    bg: "bg-amber-500/5",
    tag: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  },
  low: {
    border: "border-sky-500/25",
    bg: "bg-sky-500/5",
    tag: "bg-sky-500/10 border-sky-500/30 text-sky-500",
  },
};

const ConflictCard = ({ conflict, index }) => {
  const style = SEVERITY_STYLES[conflict.severity] || SEVERITY_STYLES.medium;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border ${style.border} ${style.bg} p-4 md:p-5 min-w-0`}
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <p className="font-semibold text-sm text-[var(--text-main)]">{conflict.topic}</p>
        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${style.tag}`}>
          {conflict.severity || "medium"} severity
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase pt-0.5 shrink-0 w-16">
            Said first
          </span>
          <p className="text-[var(--text-main)] opacity-80 leading-relaxed break-words italic">
            {conflict.earlier_statement}
          </p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase pt-0.5 shrink-0 w-16">
            Said later
          </span>
          <p className="text-[var(--text-main)] opacity-80 leading-relaxed break-words italic">
            {conflict.later_statement}
          </p>
        </div>
      </div>

      {Array.isArray(conflict.values) && conflict.values.length === 2 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-[var(--glass-base)]/10 border border-[var(--glass-border)] text-xs font-mono text-[var(--text-main)] opacity-70 line-through">
            {conflict.values[0]}
          </span>
          <ArrowRight size={13} className="opacity-40 text-[var(--text-main)]" />
          <span className="px-2.5 py-1 rounded-lg bg-[var(--text-main)]/10 border border-[var(--glass-border)] text-xs font-mono font-bold text-[var(--text-main)]">
            {conflict.values[1]}
          </span>
        </div>
      )}

      <div className="flex items-start gap-2 border-t border-[var(--glass-border)] pt-3">
        <ShieldCheck size={14} className="opacity-50 text-[var(--text-main)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-main)] opacity-70 leading-relaxed break-words">
          {conflict.resolution}
        </p>
      </div>
    </motion.div>
  );
};

const DealConflicts = ({ conflicts = [] }) => {
  const hasConflicts = Array.isArray(conflicts) && conflicts.length > 0;

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-7 min-w-0 flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-4 mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertOctagon size={18} className="opacity-60 text-[var(--text-main)]" />
          <h3 className="font-semibold text-[var(--text-main)]">Deal Conflict Detection</h3>
        </div>
        {hasConflicts ? (
          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-bold">
            {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} found
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold">
            No contradictions
          </span>
        )}
      </div>

      {hasConflicts ? (
        <div className="space-y-4 max-h-[50vh] overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar min-w-0">
          {conflicts.map((c, i) => (
            <ConflictCard key={i} conflict={c} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
          <ShieldCheck size={28} className="text-emerald-500/70" />
          <p className="text-sm text-[var(--text-main)] opacity-70 max-w-xs">
            No contradicting statements were detected — every term stayed consistent across the conversation.
          </p>
        </div>
      )}
    </div>
  );
};

export default DealConflicts;
