import React from "react";
import { motion } from "framer-motion";
import { PlusCircle } from "lucide-react";
import DealExtraction from "./DealExtraction";
import DealAgreement from "./DealAgreement";
import DealCalculator from "./DealCalculator";
import DealCountdown from "./DealCountdown";
import DealEmail from "./DealEmail";
import DealConflicts from "./DealConflicts";
import DealWhatIf from "./DealWhatIf";
import DealTranscript from "./DealTranscript";

const DealWorkspace = ({ deal, onNewDeal, onEmailUpdated }) => {
  if (!deal) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full flex flex-col gap-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-1">
            Deal Workspace
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)]">{deal.deal_name}</h2>
        </div>
        <button
          onClick={onNewDeal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-base)]/10 transition-colors text-sm font-semibold"
        >
          <PlusCircle size={16} />
          New Deal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-w-0">
        <DealExtraction extracted={deal.extracted} generationMode={deal.generation_mode} />
        <DealAgreement agreement={deal.agreement} dealName={deal.deal_name} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-w-0">
        <DealConflicts conflicts={deal.extracted?.conflicts} />
        <DealWhatIf dealId={deal.id} extracted={deal.extracted} onApplied={onEmailUpdated} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start min-w-0">
        <DealCalculator extracted={deal.extracted} />
        <DealCountdown extracted={deal.extracted} />
        <DealEmail
          dealId={deal.id}
          email={deal.email}
          extracted={deal.extracted}
          agreement={deal.agreement}
          onEmailUpdated={onEmailUpdated}
        />
      </div>

      {deal.transcript && <DealTranscript transcript={deal.transcript} />}
    </motion.div>
  );
};

export default DealWorkspace;
