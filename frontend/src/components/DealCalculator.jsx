import React, { useEffect, useState } from "react";
import { Calculator } from "lucide-react";

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

const formatNumber = (num, currency) => {
  if (num === null || num === undefined || Number.isNaN(num)) return "—";
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${symbol}${Number(num).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
};

const DealCalculator = ({ extracted }) => {
  const [total, setTotal] = useState(0);
  const [advancePercent, setAdvancePercent] = useState(30);
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    if (!extracted) return;
    setTotal(extracted.total_value_numeric || 0);
    setAdvancePercent(
      extracted.advance_percent !== null && extracted.advance_percent !== undefined
        ? extracted.advance_percent
        : 30,
    );
    setCurrency(extracted.currency || "INR");
  }, [extracted]);

  const advanceAmount = (total * advancePercent) / 100;
  const balanceAmount = total - advanceAmount;

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-7 min-w-0 flex flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--glass-border)] pb-4 mb-6">
        <Calculator size={18} className="opacity-60 text-[var(--text-main)]" />
        <h3 className="font-semibold text-[var(--text-main)]">Deal Calculator</h3>
      </div>

      <div className="space-y-5 flex-1">
        <div>
          <label className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-2 block">
            Total Deal Value
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[var(--text-main)] opacity-60">
              {CURRENCY_SYMBOLS[currency] || currency}
            </span>
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value) || 0)}
              className="w-full bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl px-4 py-3 text-lg font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--text-main)]/30"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl px-2 py-3 text-sm text-[var(--text-main)] focus:outline-none"
            >
              {Object.keys(CURRENCY_SYMBOLS).map((c) => (
                <option key={c} value={c} className="bg-[var(--bg-main)]">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase">
              Advance Percentage
            </label>
            <span className="text-sm font-bold text-[var(--text-main)]">{advancePercent}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={advancePercent}
            onChange={(e) => setAdvancePercent(Number(e.target.value))}
            className="w-full accent-[var(--text-main)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-base)]/5 p-4">
            <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-1.5">
              Advance ({advancePercent}%)
            </p>
            <p className="text-xl font-bold text-[var(--text-main)] break-all">{formatNumber(advanceAmount, currency)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-base)]/5 p-4">
            <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-1.5">
              Balance ({100 - advancePercent}%)
            </p>
            <p className="text-xl font-bold text-[var(--text-main)] break-all">{formatNumber(balanceAmount, currency)}</p>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center pt-1">
          Auto-filled from the extracted deal value — adjust freely if terms change.
        </p>
      </div>
    </div>
  );
};

export default DealCalculator;
