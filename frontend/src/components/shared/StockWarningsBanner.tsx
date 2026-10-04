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

  return (
    <div className="rounded-xl p-4 space-y-3 shadow-sm bg-slate-900/70 border border-slate-700/80 text-slate-200 backdrop-blur-md">
      <div className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 text-slate-300">
        <AlertTriangle className={`h-4 w-4 shrink-0 ${hasShortfall ? "text-amber-400" : "text-sky-400"}`} />
        <span>Warehouse Pre-Confirmation Stock Alerts ({warnings.length})</span>
      </div>

      <div className="space-y-2.5 pt-0.5">
        {warnings.map((w, idx) => {
          const isShortfall = w.severity === "high" || w.type === "insufficient_stock";

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-3.5 ${
                isShortfall
                  ? "bg-slate-800/90 border-amber-500/40 text-slate-100"
                  : "bg-slate-800/90 border-sky-500/40 text-slate-100"
              }`}
            >
              {isShortfall ? (
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-400" />
              ) : (
                <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-sky-400" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold leading-snug text-slate-100">{w.message}</div>
                <div className="text-[11px] font-mono mt-1.5 flex flex-wrap items-center gap-4 text-slate-400">
                  <span>
                    Part: <b className="font-semibold text-slate-200">{w.part_name}</b>
                  </span>
                  <span>
                    Requested: <b className="font-semibold text-slate-200">{w.requested_qty?.toLocaleString()}</b>
                  </span>
                  <span>
                    Stock: <b className="font-semibold text-slate-200">{w.available_stock?.toLocaleString()}</b>
                  </span>
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
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80"
      >
        <AlertTriangle className="h-3 w-3 text-amber-400" />
        Stock Shortage ({status.available_stock} avail)
      </span>
    );
  }

  if (status.status === "sufficient") {
    return (
      <span
        title={`Stock available: ${status.available_stock}`}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80"
      >
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        In Stock ({status.available_stock} avail)
      </span>
    );
  }

  return null;
}
