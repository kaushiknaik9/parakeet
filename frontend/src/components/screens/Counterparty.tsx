import { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Check, Send, PenLine, AlertTriangle, Sun, Moon, CheckCircle2, LockKeyhole } from "lucide-react";
import { Button, Card, IconButton } from "../shared/armor-ui";
import { confirmDeal, requestDealChanges } from "@/lib/api";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, money } from "@/lib/format";
import type { DealRecord, Screen } from "@/types/armor";

export function Counterparty({ deal: initialDeal, go, notify, setDeal, theme, onToggleTheme }: {
  deal: DealRecord; go: (s: Screen) => void; notify: (s: string) => void; setDeal: (d: DealRecord) => void;
  theme?: "dark" | "light"; onToggleTheme?: () => void;
}) {
  const [deal, setLocalDeal] = useState(initialDeal);
  const [changes, setChanges] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const apply = (updated: DealRecord) => { setLocalDeal(updated); setDeal(updated); };

  const doConfirm = async () => {
    setBusy(true);
    try { apply(await confirmDeal(deal.id)); notify("Terms confirmed."); }
    catch (e: any) { notify(e.message); }
    finally { setBusy(false); }
  };

  const submitChanges = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { apply(await requestDealChanges(deal.id, text.trim())); notify("Change request recorded."); setChanges(false); setText(""); }
    catch (e: any) { notify(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="counterparty-page">
      <header>
        <button className="brand" onClick={() => go("agreement")}>
          <span className="brand__mark">
            <img src={theme === "dark" ? "/LOGO_Fair.png" : "/LOGO_Dark.png"} alt="Armor" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </span>
          <span>ARMOR</span>
        </button>
        <Button variant="secondary" onClick={() => go("deal")} style={{ minHeight: 32, padding: "0 12px", fontSize: 11 }}>
          <ArrowLeft size={14} /> Back to Deal
        </Button>
        {onToggleTheme && (
          <IconButton label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </IconButton>
        )}
        <span className="secure-pill"><LockKeyhole />No public link yet — for internal review</span>
      </header>
      <main>
        <div className="counterparty-heading">
          <span className="eyebrow">DEAL AGREEMENT · {deal.id}</span>
          <h1>{deal.deal_name}</h1>
          <p>This is what {seller} would see if you shared this agreement with them. Confirming or requesting changes here updates the real deal record in Armor.</p>
          <span className={`status status--${dealBadge(deal).toLowerCase().replace(" ", "-")}`}><span className="status__dot" />{dealBadge(deal)}</span>
        </div>
        <div className="counterparty-grid">
          <article className="terms-sheet">
            <div className="terms-total"><span>AGREEMENT VALUE</span><b>{extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}</b></div>
            <section><h3>Parties</h3><div className="party-grid"><p><span>BUYER</span><b>{buyer}</b></p><p><span>SELLER</span><b>{seller}</b></p></div></section>
            <section><h3>Commercial terms</h3><dl>
              <div><dt>Product</dt><dd>{extracted.product_or_service || "—"}</dd></div>
              <div><dt>Quantity</dt><dd>{extracted.quantity || "—"}</dd></div>
              <div><dt>Payment</dt><dd>{extracted.payment_terms || "—"}</dd></div>
              <div><dt>Delivery</dt><dd>{extracted.delivery_terms || "—"}</dd></div>
            </dl></section>
            <section><h3>Conditions</h3><p>{(extracted.conditions || []).join(" ") || "None stated."}</p></section>
          </article>
          <aside className="confirm-box">
            <ShieldCheck size={30} />
            <h3>Confirm the agreed terms</h3>
            <p>By confirming, you acknowledge that these terms accurately reflect the business conversation. This persists to the deal record — but since there's no separate public link yet, only people with access to this Armor workspace can act on it.</p>
            {deal.confirmation_status === "changes_requested" && deal.change_request && (
              <div className="alert-card" style={{ padding: 10, gridTemplateColumns: "auto 1fr" }}><AlertTriangle size={16} /><div><b style={{ fontSize: 10 }}>Last change request</b><p style={{ fontSize: 10 }}>{deal.change_request}</p></div></div>
            )}
            {changes ? (
              <>
                <textarea placeholder="Describe the term you would like to change..." value={text} onChange={(e) => setText(e.target.value)} />
                <Button variant="secondary" disabled={!text.trim() || busy} onClick={submitChanges}><Send />Submit Change Request</Button>
                <button className="text-link" onClick={() => setChanges(false)}>Cancel</button>
              </>
            ) : (
              <>
                <Button variant="success" onClick={doConfirm} disabled={busy}><Check />I Confirm These Terms</Button>
                <Button variant="secondary" onClick={() => setChanges(true)} disabled={busy}><PenLine />Request Changes</Button>
              </>
            )}
            {deal.confirmation_status === "confirmed" && <div className="success-panel"><CheckCircle2 /><b>Terms confirmed</b><span>Saved to the deal</span></div>}
          </aside>
        </div>
      </main>
    </div>
  );
}
