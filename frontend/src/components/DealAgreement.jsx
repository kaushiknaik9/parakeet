import React from "react";
import { Download, FileCheck2 } from "lucide-react";

const buildAgreementText = (agreement, dealName) => {
  const lines = [agreement.title || dealName || "Deal Agreement", "", agreement.summary || "", ""];
  (agreement.sections || []).forEach((s) => {
    lines.push(s.heading.toUpperCase());
    lines.push(s.content || "—");
    lines.push("");
  });
  return lines.join("\n");
};

const DealAgreement = ({ agreement, dealName }) => {
  if (!agreement) return null;

  const download = () => {
    const text = buildAgreementText(agreement, dealName);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(dealName || "deal-agreement").replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-7 min-w-0 flex flex-col">
      <div className="flex justify-between items-start gap-3 border-b border-[var(--glass-border)] pb-4 mb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-1">
            What exactly did we agree to?
          </p>
          <h3 className="font-semibold text-lg text-[var(--text-main)] flex items-center gap-2 break-words">
            <FileCheck2 size={18} className="opacity-60 shrink-0" />
            {agreement.title || "Deal Agreement"}
          </h3>
        </div>
        <button
          onClick={download}
          title="Download as .txt"
          className="shrink-0 p-2.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)] hover:bg-[var(--glass-base)]/10 transition-colors"
        >
          <Download size={16} />
        </button>
      </div>

      <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar space-y-5 min-w-0">
        <p className="text-sm text-[var(--text-main)] opacity-90 leading-relaxed italic border-l-2 border-[var(--glass-base)]/30 pl-4 break-words">
          {agreement.summary}
        </p>

        {(agreement.key_terms || []).filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {agreement.key_terms.filter(Boolean).map((t, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-[var(--text-main)]/5 border border-[var(--glass-border)] text-xs font-semibold text-[var(--text-main)] break-words max-w-full"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {(agreement.sections || []).map((s, i) => (
            <div key={i} className="border-t border-[var(--glass-border)] pt-4 first:border-t-0 first:pt-0">
              <p className="text-[10px] font-bold text-[var(--text-main)] opacity-40 tracking-widest uppercase mb-1.5">
                {s.heading}
              </p>
              <p className="text-sm text-[var(--text-main)] opacity-85 leading-relaxed break-words whitespace-pre-wrap">
                {s.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DealAgreement;
