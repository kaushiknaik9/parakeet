import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, BOMTable } from "../shared/armor-ui";
import type { ExtractedDeal } from "@/types/armor";

interface DealMetricsCardProps {
  extracted: ExtractedDeal;
  dealName: string;
}

export function DealMetricsCard({ extracted, dealName }: DealMetricsCardProps) {
  const buyer = extracted.parties?.[0]?.name || "Buyer";
  const seller = extracted.parties?.[1]?.name || "Seller";
  const supply = extracted.supply_terms || {};

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary block">
            ELECTRONICS PROCUREMENT DEAL
          </span>
          <h3 className="text-lg font-bold text-foreground tracking-tight">{dealName}</h3>
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 bg-secondary/50 rounded-lg border border-border text-xs">
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-bold block">BUYER</span>
          <b className="text-sm font-bold text-foreground">{buyer}</b>
        </div>
        <ArrowRight size={16} className="text-muted-foreground" />
        <div className="text-right">
          <span className="text-[10px] uppercase text-muted-foreground font-bold block">SELLER</span>
          <b className="text-sm font-bold text-foreground">{seller}</b>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-secondary/30 rounded-lg border border-border">
          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Product / Part</span>
          <b className="text-foreground font-bold text-xs">{extracted.product_or_service || "—"}</b>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg border border-border">
          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Total Quantity</span>
          <b className="text-foreground font-bold text-xs">{extracted.quantity || "—"}</b>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg border border-border">
          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Total Deal Value</span>
          <b className="text-emerald-600 dark:text-emerald-400 font-bold text-sm font-mono flex items-center gap-1">
            {extracted.total_value || "—"}
            <CheckCircle2 size={12} className="text-emerald-500" />
          </b>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg border border-border">
          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Lead Time</span>
          <b className="text-foreground font-bold text-xs">{supply.lead_time || extracted.delivery_terms || "—"}</b>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg border border-border">
          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Warranty / RMA</span>
          <b className="text-foreground font-bold text-xs">{supply.rma_warranty || "Standard RMA"}</b>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg border border-border">
          <span className="text-[10px] uppercase text-muted-foreground block font-semibold">Compliance</span>
          <b className="text-foreground font-bold text-xs">{(supply.compliance || ["RoHS", "CE"]).join(", ")}</b>
        </div>
      </div>

      <div className="pt-2">
        <BOMTable items={extracted.items} currency={extracted.currency} />
      </div>
    </Card>
  );
}
