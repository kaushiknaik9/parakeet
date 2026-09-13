import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Handshake,
  ListChecks,
  Package,
  RefreshCcw,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";

const Field = ({ icon: Icon, label, children }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase">
      <Icon size={13} />
      {label}
    </div>
    <div className="text-sm text-[var(--text-main)] opacity-90 leading-relaxed break-words">{children}</div>
  </div>
);

const Pill = ({ children }) => (
  <span className="inline-block px-2.5 py-1 rounded-lg bg-[var(--glass-base)]/10 border border-[var(--glass-border)] text-xs text-[var(--text-main)] opacity-90 mr-1.5 mb-1.5 break-words max-w-full">
    {children}
  </span>
);

const DealExtraction = ({ extracted, generationMode }) => {
  if (!extracted) return null;

  const {
    parties = [],
    product_or_service,
    quantity,
    total_value,
    payment_terms,
    delivery_terms,
    deadlines = [],
    responsibilities = [],
    conditions = [],
    negotiated_changes = [],
  } = extracted;

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-7 min-w-0 flex flex-col">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-[var(--glass-border)] pb-4 mb-5">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <ScrollText size={18} className="opacity-60" />
          Extracted Deal Data
        </h3>
        {generationMode === "fallback" && (
          <span
            title="No LLM API key configured — showing heuristic extraction. Add a key to backend/.env for full AI analysis."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-bold"
          >
            <AlertTriangle size={12} />
            Heuristic mode
          </span>
        )}
        {generationMode === "ai" && (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold">
            AI analyzed
          </span>
        )}
      </div>

      <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar space-y-6 min-w-0">
        <Field icon={Users} label="Parties">
          {parties.map((p, i) => (
            <Pill key={i}>
              {p.name} · {p.role}
            </Pill>
          ))}
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field icon={Package} label="Product / Service">
            {product_or_service || "—"}
          </Field>
          <Field icon={Boxes} label="Quantity">
            {quantity || "—"}
          </Field>
        </div>

        <Field icon={Wallet} label="Total Value">
          <span className="text-2xl font-bold text-[var(--text-main)]">{total_value || "—"}</span>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field icon={Handshake} label="Payment Terms">
            {payment_terms || "—"}
          </Field>
          <Field icon={Boxes} label="Delivery Terms">
            {delivery_terms || "—"}
          </Field>
        </div>

        <Field icon={CalendarClock} label="Deadlines">
          {deadlines.length ? (
            deadlines.map((d, i) => (
              <Pill key={i}>
                {d.label || "Deadline"}: {d.raw_text || d.date || "unspecified"}
              </Pill>
            ))
          ) : (
            <span className="opacity-50">No explicit deadline captured</span>
          )}
        </Field>

        <Field icon={ListChecks} label="Responsibilities">
          {responsibilities.length ? (
            <ul className="space-y-1.5">
              {responsibilities.map((r, i) => (
                <li key={i}>
                  <span className="font-semibold">{r.party}:</span> {r.responsibility}
                </li>
              ))}
            </ul>
          ) : (
            <span className="opacity-50">Not specified</span>
          )}
        </Field>

        <Field icon={ScrollText} label="Conditions">
          {conditions.length ? (
            <ul className="list-disc list-inside space-y-1">
              {conditions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            <span className="opacity-50">None explicitly stated</span>
          )}
        </Field>

        {negotiated_changes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 tracking-widest uppercase mb-2">
              <RefreshCcw size={13} />
              Negotiated Changes
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-main)] opacity-90">
              {negotiated_changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DealExtraction;
