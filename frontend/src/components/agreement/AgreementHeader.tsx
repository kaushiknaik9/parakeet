import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "../shared/armor-ui";
import { dealBadge } from "../features/DealHelpers";
import { formatDateTime } from "@/lib/format";
import type { DealRecord, Screen } from "@/types/armor";

interface AgreementHeaderProps {
  deal: DealRecord;
  go: (s: Screen) => void;
}

export function AgreementHeader({ deal, go }: AgreementHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => go("deal")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Deal
        </button>
        <div className="flex items-center gap-3">
          <StatusBadge status={dealBadge(deal)} />
          {deal.signature_status === "signed" && deal.signed_at && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full font-mono">
              <CheckCircle2 size={12} />
              Signed {formatDateTime(deal.signed_at)}
            </span>
          )}
        </div>
      </div>

      <div>
        <span className="text-[11px] font-extrabold tracking-widest text-primary uppercase block mb-1">
          ARMOR DEAL AGREEMENT
        </span>
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{deal.deal_name}</h2>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Deal ID: {deal.id} · Created {formatDateTime(deal.created_at)}
        </p>
      </div>
    </div>
  );
}
