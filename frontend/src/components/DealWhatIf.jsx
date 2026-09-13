import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { applyChange, simulateWhatIf } from "../api/dealapi";

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

const EXAMPLES = [
  "Actually, make it 600 units instead of 500",
  "Let's do 40% advance instead",
  "Push the deadline to 15th November",
];

const diffFields = (before = {}, after = {}) => {
  const keys = ["quantity", "total_value", "advance_percent", "advance_amount", "balance_amount"];
  const rows = [];
  keys.forEach((k) => {
    const a = before?.[k];
    const b = after?.[k];
    const changed = JSON.stringify(a) !== JSON.stringify(b);
    if (changed && (a !== undefined || b !== undefined)) {
      rows.push({ key: k, before: a, after: b });
    }
  });
  return rows;
};

const LABELS = {
  quantity: "Quantity",
  total_value: "Total Value",
  advance_percent: "Advance %",
  advance_amount: "Advance Amount",
  balance_amount: "Balance Amount",
};

const formatVal = (key, val, currency) => {
  if (val === null || val === undefined || val === "") return "—";
  if (key === "advance_percent") return `${val}%`;
  if (key === "advance_amount" || key === "balance_amount") {
    const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
    return `${symbol}${Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
  return String(val);
};

const DealWhatIf = ({ dealId, extracted, onApplied }) => {
  const [changeText, setChangeText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(false);

  const runSimulation = async (text) => {
    const finalText = (text ?? changeText).trim();
    if (!finalText || !dealId) return;
    setChangeText(finalText);
    setIsSimulating(true);
    setError(null);
    setResult(null);
    setApplied(false);
    try {
      const res = await simulateWhatIf(dealId, finalText);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApply = async () => {
    if (!result?.updated_extracted || !dealId) return;
    setIsApplying(true);
    setError(null);
    try {
      const updatedDeal = await applyChange(dealId, result.updated_extracted, result.updated_agreement);
      setApplied(true);
      onApplied?.(updatedDeal);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setApplied(false);
    setChangeText("");
  };

  const rows = result ? diffFields(extracted, result.updated_extracted) : [];
  const currency = extracted?.currency || "INR";

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-7 min-w-0 flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-4 mb-5">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="opacity-60 text-[var(--text-main)]" />
          <h3 className="font-semibold text-[var(--text-main)]">What happens if something changes?</h3>
        </div>
        {result && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)] opacity-60 hover:opacity-100 transition-opacity"
          >
            <RotateCcw size={12} />
            Try another
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!result && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <p className="text-xs text-[var(--text-muted)]">
              Describe a hypothetical change and see exactly what it does to the total value, advance, balance,
              and deadlines — before anyone commits to it.
            </p>
            <textarea
              value={changeText}
              onChange={(e) => setChangeText(e.target.value)}
              placeholder='e.g. "Actually, make it 600 units instead of 500"'
              rows={3}
              className="w-full bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-2xl p-4 text-sm text-[var(--text-main)] placeholder-[var(--text-main)]/30 focus:outline-none focus:border-[var(--text-main)]/30 resize-none"
            />

            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setChangeText(ex)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[11px] text-[var(--text-main)] opacity-60 hover:opacity-100 hover:bg-[var(--glass-base)]/10 transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={() => runSimulation()}
              disabled={!changeText.trim() || isSimulating}
              className="self-start flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSimulating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isSimulating ? "Simulating…" : "Simulate impact"}
            </button>
          </motion.div>
        )}

        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 min-w-0"
          >
            <div className="rounded-2xl bg-[var(--glass-base)]/5 border border-[var(--glass-border)] p-3">
              <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-1">
                Simulated change
              </p>
              <p className="text-sm text-[var(--text-main)] italic break-words">"{result.change_text}"</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-2">
                Impact
              </p>
              <ul className="space-y-1.5">
                {(result.impacts || []).map((line, i) => (
                  <li key={i} className="text-sm text-[var(--text-main)] opacity-85 leading-relaxed break-words flex gap-2">
                    <span className="opacity-40">•</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {rows.length > 0 && (
              <div className="rounded-2xl border border-[var(--glass-border)] overflow-hidden">
                {rows.map((r, i) => (
                  <div
                    key={r.key}
                    className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm flex-wrap ${
                      i > 0 ? "border-t border-[var(--glass-border)]" : ""
                    }`}
                  >
                    <span className="text-xs font-semibold text-[var(--text-main)] opacity-60 shrink-0">
                      {LABELS[r.key] || r.key}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span className="opacity-50 line-through">{formatVal(r.key, r.before, currency)}</span>
                      <ArrowRight size={12} className="opacity-40" />
                      <span className="font-bold text-[var(--text-main)]">{formatVal(r.key, r.after, currency)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleApply}
              disabled={isApplying || applied || !dealId}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-main)] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed w-fit"
            >
              {isApplying ? (
                <Loader2 size={16} className="animate-spin" />
              ) : applied ? (
                <Check size={16} className="text-emerald-500" />
              ) : (
                <Check size={16} />
              )}
              {applied ? "Applied to deal" : isApplying ? "Applying…" : "Apply this change to the deal"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealWhatIf;
