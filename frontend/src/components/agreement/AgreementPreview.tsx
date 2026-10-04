import { ShieldCheck, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { ExtractedDeal } from "@/types/armor";

interface AgreementPreviewProps {
  title: string;
  extracted: ExtractedDeal;
  notes: string;
  buyer: string;
  seller: string;
  dealId: string;
  signedAt?: string | null;
  signerEmail?: string | null;
}

export function AgreementPreview({
  title,
  extracted,
  notes,
  buyer,
  seller,
  dealId,
  signedAt,
  signerEmail,
}: AgreementPreviewProps) {
  const supply = extracted.supply_terms || {};
  const items = extracted.items || [];
  const currency = extracted.currency || "INR";

  return (
    <aside className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
        <span>LIVE AGREEMENT PREVIEW</span>
        <span className="font-mono text-slate-400">DEAL {dealId.toUpperCase()}</span>
      </div>

      {/* Printable Legal Artifact Paper Canvas — Explicit White Background & Immutable Dark Ink */}
      <article className="bg-white text-slate-900 border border-slate-200 shadow-xl rounded-xl p-8 space-y-6">
        {/* Header / Brand */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold tracking-wider text-sm">
            <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md">
              <ShieldCheck size={18} />
            </span>
            ARMOR PROCUREMENT DEALS
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
            COMMERCIAL AGREEMENT · {dealId.toUpperCase()}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">{title}</h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            This deal record documents the commercial electronics supply terms mutually agreed upon by both counterparties.
          </p>
        </div>

        <hr className="border-slate-200" />

        {/* Section 1: Parties */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">1. Contracting Parties</h4>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-0.5">Buyer Entity</span>
              <b className="text-slate-900 font-bold text-sm">{buyer}</b>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-0.5">Supplier Entity</span>
              <b className="text-slate-900 font-bold text-sm">{seller}</b>
            </div>
          </div>
        </div>

        {/* Section 2: Hardware & Financial Terms */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">2. Hardware &amp; Financial Terms</h4>
          
          <div className="flex items-center justify-between bg-slate-100/90 border border-slate-200/90 p-3.5 rounded-lg mb-3">
            <span className="text-xs text-slate-700 font-semibold">Total Agreed Consideration</span>
            <b className="text-base font-bold font-mono text-slate-900">{extracted.total_value || "—"}</b>
          </div>

          <div className="text-xs text-slate-700 space-y-1 mb-3">
            <p><b className="text-slate-900">Product / Batch:</b> {extracted.product_or_service || "—"}</p>
            <p><b className="text-slate-900">Payment Milestones:</b> {extracted.payment_terms || "Standard commercial invoice."}</p>
          </div>

          {/* Immutable Light BOM Table */}
          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 my-3">
              <div className="bg-slate-100 text-slate-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                ELECTRONICS BILL OF MATERIALS (BOM)
              </div>
              <table className="w-full text-left text-xs bg-white text-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                    <th className="p-2.5">Part / MPN</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Quantity</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">{item.part_name}</td>
                      <td className="p-2.5 text-slate-600">{item.category}</td>
                      <td className="p-2.5 text-right font-mono text-slate-900">{item.quantity?.toLocaleString() || "—"}</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">{item.unit_price ? `${currency} ${item.unit_price}` : "—"}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{item.total_price ? `${currency} ${item.total_price.toLocaleString()}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Supply Terms */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">3. Procurement &amp; Supply Terms</h4>
          <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 font-semibold text-[10px] uppercase block mb-0.5">Lead Time</span>
              <span className="text-slate-900 font-medium">{supply.lead_time || extracted.delivery_terms || "Not specified"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold text-[10px] uppercase block mb-0.5">RMA &amp; Warranty</span>
              <span className="text-slate-900 font-medium">{supply.rma_warranty || "12-Month RMA"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold text-[10px] uppercase block mb-0.5">Compliance</span>
              <span className="text-slate-900 font-medium">{(supply.compliance || ["RoHS", "CE"]).join(", ")}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">4. Conditions &amp; Special Notes</h4>
          <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
            {notes || "None."}
          </p>
        </div>

        {/* Execution Digital Stamp if Signed */}
        {signedAt && (
          <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-lg flex items-start gap-3 text-xs text-slate-900">
            <CheckCircle size={18} className="text-slate-700 shrink-0 mt-0.5" />
            <div>
              <b className="font-bold text-slate-900 block text-sm">✓ Legally Accepted &amp; Digitally Signed</b>
              <p className="text-slate-700 mt-0.5 text-[11px]">
                Executed by <span className="font-semibold">{signerEmail || "Counterparty"}</span> on {formatDateTime(signedAt)}. Verified in Armor deal ledger.
              </p>
            </div>
          </div>
        )}

        <footer className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 text-center leading-relaxed">
          Generated from verified B2B procurement conversation. Authenticated via Armor E-Signature Engine.
        </footer>
      </article>
    </aside>
  );
}
