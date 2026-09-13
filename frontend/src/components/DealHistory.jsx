import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, FileX2, Loader2, Trash2 } from "lucide-react";
import { deleteDeal, listDeals } from "../api/dealapi";

const DealHistory = ({ username, onOpenDeal }) => {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listDeals(username);
      setDeals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (username) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleDelete = async (e, dealId) => {
    e.stopPropagation();
    try {
      await deleteDeal(dealId);
      setDeals((d) => d.filter((x) => x.id !== dealId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in zoom-in duration-500">
      <h2 className="text-3xl font-bold text-[var(--text-main)] mb-8">Deal History</h2>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[var(--text-muted)]" size={28} />
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-red-500 text-center py-10">{error}</p>}

      {!isLoading && !error && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 opacity-50">
          <FileX2 size={36} />
          <p className="text-sm font-mono tracking-wide uppercase">No deals analyzed yet</p>
        </div>
      )}

      {!isLoading && deals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {deals.map((deal) => (
            <motion.div
              key={deal.id}
              whileHover={{ y: -4 }}
              onClick={() => onOpenDeal(deal.id)}
              className="glass-panel rounded-2xl p-5 cursor-pointer group relative"
            >
              <button
                onClick={(e) => handleDelete(e, deal.id)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-main)] opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
              <h4 className="font-bold text-[var(--text-main)] pr-8 mb-1 truncate">{deal.deal_name}</h4>
              <p className="text-lg font-bold text-[var(--text-main)] opacity-80 mb-3">
                {deal.extracted?.total_value || "—"}
              </p>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Calendar size={12} />
                {new Date(deal.created_at).toLocaleString()}
                {deal.generation_mode === "fallback" && (
                  <span className="ml-auto px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                    Heuristic
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealHistory;
