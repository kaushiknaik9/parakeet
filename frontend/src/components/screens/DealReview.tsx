import { useState, useEffect } from "react";
import { ArrowLeft, Check, FileText, RefreshCcw, ShieldCheck } from "lucide-react";
import { Button, Card, Field } from "../shared/armor-ui";
import { updateDeal, regenerateEmail } from "@/lib/api";
import { partyLabel } from "../features/DealHelpers";
import type { DealRecord, ExtractedDeal, AuthUser } from "@/types/armor";

function DocumentPreview({ title, extracted, notes, buyer, seller, dealId }: {
  title: string; extracted: ExtractedDeal; notes: string; buyer: string; seller: string; dealId: string;
}) {
  return (
    <aside className="document-wrap">
      <div className="document-label">LIVE AGREEMENT PREVIEW <span>DEAL {dealId.toUpperCase()}</span></div>
      <article className="document">
        <div className="document__brand"><span className="brand__mark"><ShieldCheck /></span>ARMOR</div>
        <span className="document__kicker">DEAL AGREEMENT · {dealId.toUpperCase()}</span>
        <h2>{title}</h2>
        <p>This deal record documents the commercial terms confirmed by both parties following their business conversation.</p>
        <hr />
        <h4>1. Parties</h4>
        <p><b>Buyer:</b> {buyer}<br /><b>Seller:</b> {seller}</p>
        <h4>2. Financial terms</h4>
        <div className="document-total"><span>Total deal value</span><b>{extracted.total_value || "—"}</b></div>
        <p>{extracted.payment_terms || "Payment terms not specified."}</p>
        <h4>3. Delivery</h4>
        <p>{extracted.quantity ? `${extracted.quantity} of ${extracted.product_or_service}. ` : ""}{extracted.delivery_terms || "Delivery terms not specified."}</p>
        <h4>4. Additional notes</h4>
        <p>{notes || "None."}</p>
        <footer>Generated from a verified business conversation. This record is not represented as a legally binding electronic signature.</footer>
      </article>
    </aside>
  );
}

import type { Screen } from "@/types/armor";

export function DealReview({ deal, setDeal, go, notify, session }: {
  deal: DealRecord; setDeal: (d: DealRecord) => void; go: (s: Screen) => void; notify: (s: string) => void; session: AuthUser;
}) {
  const [name, setName] = useState(deal.deal_name);
  const [extracted, setExtracted] = useState<ExtractedDeal>(deal.extracted);
  const [notes, setNotes] = useState((deal.extracted.conditions || []).join(" "));
  const [saving, setSaving] = useState(false);
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const setParty = (role: "Buyer" | "Seller", value: string) => {
    const parties = [...(extracted.parties || [])];
    const idx = parties.findIndex((p) => p.role?.toLowerCase() === role.toLowerCase());
    if (idx >= 0) parties[idx] = { name: value, role: parties[idx]?.role || role };
    else parties.push({ name: value, role });
    setExtracted({ ...extracted, parties });
  };

  const save = async (andContinue: boolean) => {
    setSaving(true);
    try {
      const nextExtracted = { ...extracted, conditions: notes ? [notes] : [] };
      const updated = await updateDeal(deal.id, { deal_name: name, extracted: nextExtracted });
      let final = updated;
      try { final = await regenerateEmail(deal.id, nextExtracted, deal.agreement); } catch { /* email regen is best-effort */ }
      setDeal(final);
      notify(andContinue ? "Deal confirmed." : "Draft saved.");
      if (andContinue) go("agreement");
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REVIEW</span>
          <h2>Review Deal Agreement</h2>
          <p>Edit the structured terms. The agreement preview updates with your changes.</p>
        </div>
        {saving ? <span className="save-state"><RefreshCcw size={13} className="animate-spin" />Saving…</span> : null}
      </div>
      <button className="back-link" onClick={() => go("deal")}><ArrowLeft size={14} /> Back</button>
      <div className="editor-split">
        <div className="deal-form">
          <Card>
            <div className="card-head"><h3>Deal information</h3></div>
            <Field label="Deal title" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="form-grid">
              <Field label="Buyer" value={buyer === "Buyer" ? "" : buyer} onChange={(e) => setParty("Buyer", e.target.value)} placeholder="Buyer name" />
              <Field label="Seller" value={seller === "Seller" ? "" : seller} onChange={(e) => setParty("Seller", e.target.value)} placeholder="Seller name" />
              <Field label="Product / service" value={extracted.product_or_service} onChange={(e) => setExtracted({ ...extracted, product_or_service: e.target.value })} />
              <Field label="Quantity" value={extracted.quantity} onChange={(e) => setExtracted({ ...extracted, quantity: e.target.value })} />
              <Field label="Total value (numeric)" type="number" value={extracted.total_value_numeric ?? ""} onChange={(e) => setExtracted({ ...extracted, total_value_numeric: e.target.value ? Number(e.target.value) : null })} />
              <Field label="Currency" value={extracted.currency} onChange={(e) => setExtracted({ ...extracted, currency: e.target.value })} />
            </div>
          </Card>
          <Card>
            <div className="card-head"><h3>Payment &amp; delivery</h3></div>
            <Field label="Payment terms" value={extracted.payment_terms} onChange={(e) => setExtracted({ ...extracted, payment_terms: e.target.value })} />
            <Field label="Delivery terms" value={extracted.delivery_terms} onChange={(e) => setExtracted({ ...extracted, delivery_terms: e.target.value })} />
          </Card>
          <Card>
            <div className="card-head"><h3>Additional notes / conditions</h3></div>
            <textarea className="large-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Card>
        </div>
        <DocumentPreview title={name} extracted={extracted} notes={notes} buyer={buyer} seller={seller} dealId={deal.id} />
      </div>
      <div className="sticky-actions">
        <Button variant="secondary" onClick={() => save(false)} disabled={saving}><FileText size={16} />Save Draft</Button>
        <Button variant="success" onClick={() => save(true)} disabled={saving}><Check size={16} />Confirm Agreement</Button>
      </div>
    </>
  );
}
