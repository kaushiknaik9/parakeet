import React from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { StockStatusItem, StockWarning } from "@/types/armor";

interface StockWarningsBannerProps {
  warnings?: StockWarning[];
  stockStatus?: StockStatusItem[];
  compact?: boolean;
}

export function StockWarningsBanner({ warnings, stockStatus, compact = false }: StockWarningsBannerProps) {
  if (!warnings || warnings.length === 0) return null;

  const hasShortfall = warnings.some((w) => w.severity === "high" || w.type === "insufficient_stock");

  const containerClass = hasShortfall
    ? "bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50"
    : "bg-sky-50/80 dark:bg-sky-950/25 border border-sky-200 dark:border-sky-900/50";

  const headerTextClass = hasShortfall
    ? "text-amber-900 dark:text-amber-300"
    : "text-sky-900 dark:text-sky-300";

  const headerIconClass = hasShortfall
    ? "text-amber-600 dark:text-amber-400"
    : "text-sky-600 dark:text-sky-400";

  return (
    <div className={`rounded-xl p-4 space-y-3 shadow-sm ${containerClass}`}>
      <div className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${headerTextClass}`}>
        <AlertTriangle className={`h-4 w-4 shrink-0 ${headerIconClass}`} />
        <span>Warehouse Pre-Confirmation Stock Alerts ({warnings.length})</span>
      </div>

      <div className="space-y-2.5 pt-0.5">
        {warnings.map((w, idx) => {
          const isShortfall = w.severity === "high" || w.type === "insufficient_stock";

          const cardClass = isShortfall
            ? "bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-800/80 text-amber-950 dark:text-amber-100"
            : "bg-sky-100/70 dark:bg-sky-950/60 border border-sky-300/80 dark:border-sky-800/80 text-sky-950 dark:text-sky-100";

          const iconClass = isShortfall
            ? "text-amber-700 dark:text-amber-400"
            : "text-sky-700 dark:text-sky-400";

          const metadataClass = isShortfall
            ? "text-amber-900/90 dark:text-amber-200/80"
            : "text-sky-900/90 dark:text-sky-200/80";

          return (
            <div key={idx} className={`p-3.5 rounded-lg border text-xs flex items-start gap-3.5 ${cardClass}`}>
              {isShortfall ? (
                <AlertTriangle className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${iconClass}`} />
              ) : (
                <Info className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${iconClass}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold leading-snug">{w.message}</div>
                <div className={`text-[11px] font-mono mt-1.5 flex flex-wrap items-center gap-4 ${metadataClass}`}>
                  <span>Part: <b className="font-semibold">{w.part_name}</b></span>
                  <span>Requested: <b className="font-semibold">{w.requested_qty?.toLocaleString()}</b></span>
                  <span>Stock: <b className="font-semibold">{w.available_stock?.toLocaleString()}</b></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StockStatusBadge({ status }: { status?: StockStatusItem }) {
  if (!status) return null;

  if (status.status === "insufficient") {
    return (
      <span
        title={`Requested ${status.requested_qty} but only ${status.available_stock} in stock`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
      >
        <AlertTriangle className="h-3 w-3 text-amber-700 dark:text-amber-400" />
        Stock Shortage ({status.available_stock} avail)
      </span>
    );
  }

  if (status.status === "sufficient") {
    return (
      <span
        title={`Stock available: ${status.available_stock}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
      >
        <CheckCircle2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
        In Stock ({status.available_stock} avail)
      </span>
    );
  }

  return null;
}
