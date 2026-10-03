import { ArrowLeft, AlertTriangle, Sparkles, ShieldCheck, ArrowRight, Info } from "lucide-react";
import { Button, Card, StatusBadge } from "../shared/armor-ui";
import type { DealRecord, Screen } from "@/types/armor";
import { AnomalyWarningList } from "../analysis/AnomalyWarningList";
import { DealMetricsCard } from "../analysis/DealMetricsCard";

export function Analysis({ isAnalyzing, error, deal, go }: { isAnalyzing: boolean; error: string | null; deal: DealRecord | null; go: (s: Screen) => void }) {
  if (isAnalyzing) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto my-12 space-y-4">
        <span className="p-3 bg-primary/10 text-primary rounded-full inline-block">
          <Sparkles size={28} />
        </span>
        <h2 className="text-xl font-bold text-foreground">Understanding your conversation</h2>
        <p className="text-xs text-muted-foreground">Armor is identifying the deal, not just transcribing words.</p>
        <div className="pt-4 flex items-center justify-center gap-2 text-xs font-semibold text-primary">
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Extracting terms, conditions and conflicts…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-destructive/40 bg-destructive/10 space-y-4 max-w-lg mx-auto my-12">
        <AlertTriangle className="text-destructive" size={24} />
        <div>
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-destructive block">ANALYSIS FAILED</span>
          <h3 className="text-base font-bold text-foreground">Couldn't analyze this transcript</h3>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="secondary" onClick={() => go("transcript")}>
          <ArrowLeft size={16} /> Back to transcript
        </Button>
      </Card>
    );
  }

  if (!deal) return <p className="text-xs text-muted-foreground p-4">No deal to show yet — start a new conversation.</p>;

  const { extracted, generation_mode } = deal;
  const conflicts = extracted.conflicts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary block mb-0.5">
            DEAL UNDERSTANDING
          </span>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Armor found: {extracted.product_or_service || deal.deal_name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review extracted terms and flagged contradictions before creating agreement.
          </p>
        </div>
      </div>

      <button onClick={() => go("transcript")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back
      </button>

      <AnomalyWarningList conflicts={conflicts} />
      <DealMetricsCard extracted={extracted} dealName={deal.deal_name} />

      <div className="sticky bottom-4 bg-card/90 backdrop-blur border border-border p-4 rounded-xl shadow-lg flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          {conflicts.length > 0 ? `${conflicts.length} term${conflicts.length > 1 ? "s" : ""} flagged for review` : "All terms verified"}
        </span>
        <Button onClick={() => go("review")}>
          Create Editable Deal <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
