import { useState } from "react";
import { ArrowLeft, Trash2, ShieldCheck, FileCheck2, AlertTriangle, Wand2, RefreshCcw, Check, Copy, Mail, ArrowRight } from "lucide-react";
import { Button, Card, Field, IconButton, Modal, StatusBadge } from "../shared/armor-ui";
import { deleteDeal, simulateWhatIf, applyChange, regenerateEmail } from "@/lib/api";
import { dealBadge, partyLabel } from "../features/DealHelpers";
import { formatDate, formatDateTime, money } from "@/lib/format";
import type { DealRecord, ExtractedDeal, Conflict, WhatIfResult } from "@/types/armor";

function ConflictCard({ conflict }: { conflict: Conflict }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 7, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <b style={{ fontSize: 11 }}>{conflict.topic}</b>
        <span className={conflict.severity === "high" ? "verify-warn" : ""} style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{conflict.severity} severity</span>
      </div>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0" }}><b>Earlier:</b> {conflict.earlier_statement}</p>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0" }}><b>Later:</b> {conflict.later_statement}</p>
      <p style={{ fontSize: 10, marginTop: 6 }}><b>Suggested resolution ({conflict.resolved_value}):</b> {conflict.resolution}</p>
    </div>
  );
}

function DealSummaryCard({ extracted, dealName }: { extracted: ExtractedDeal; dealName: string }) {
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");
  return (
    <Card className="deal-summary">
      <div className="summary-title"><div><span className="eyebrow">STRUCTURED DEAL</span><h3>{dealName}</h3></div></div>
      <div className="parties"><div><span>BUYER</span><b>{buyer}</b></div><ArrowRight /><div><span>SELLER</span><b>{seller}</b></div></div>
      <div className="term-grid">
        <div className="term"><span>Product / service</span><b>{extracted.product_or_service || "—"}</b></div>
        <div className="term"><span>Quantity</span><b>{extracted.quantity || "—"}</b></div>
        <div className="term"><span>Total value</span><b>{extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}</b><small className="verify-ok"><Check />Confirmed</small></div>
        <div className="term"><span>Payment terms</span><b>{extracted.payment_terms || "—"}</b></div>
        <div className="term"><span>Delivery terms</span><b>{extracted.delivery_terms || "—"}</b></div>
        <div className="term"><span>Advance</span><b>{extracted.advance_percent != null ? `${extracted.advance_percent}%` : "—"}</b></div>
      </div>
    </Card>
  );
}

function WhatIfPanel({ deal, setDeal, notify }: { deal: DealRecord; setDeal: (d: DealRecord) => void; notify: (s: string) => void }) {
  const [changeText, setChangeText] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const examples = ["Actually, make it 600 units instead of 500", "Let's do 40% advance instead", "Push the deadline back by two weeks"];

  const simulate = async (text?: string) => {
    const finalText = (text ?? changeText).trim();
    if (!finalText) return;
    setChangeText(finalText); setSimulating(true); setError(null); setResult(null);
    try { setResult(await simulateWhatIf(deal.id, finalText)); }
    catch (e: any) { setError(e.message); }
    finally { setSimulating(false); }
  };

  const apply = async () => {
    if (!result?.updated_extracted) return;
    setApplying(true);
    try {
      const updated = await applyChange(deal.id, result.updated_extracted, result.updated_agreement);
      setDeal(updated); notify("Change applied to the deal."); setResult(null); setChangeText("");
    } catch (e: any) { setError(e.message); }
    finally { setApplying(false); }
  };

  return (
    <Card style={{ padding: 20 }}>
      {!result ? (
        <div style={{ display: "grid", gap: 10 }}>
          <textarea className="large-input" value={changeText} onChange={(e) => setChangeText(e.target.value)} rows={3} placeholder='e.g. "Actually, make it 600 units instead of 500"' />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {examples.map((ex) => <button key={ex} onClick={() => setChangeText(ex)} style={{ border: "1px solid var(--border)", background: "var(--card)", borderRadius: 8, padding: "6px 10px", fontSize: 10, color: "var(--muted-foreground)" }}>{ex}</button>)}
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 11 }}>{error}</p>}
          <Button onClick={() => simulate()} loading={simulating}><Wand2 size={16} />Simulate impact</Button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 12, fontStyle: "italic" }}>"{result.change_text}"</p>
          <ul style={{ display: "grid", gap: 6, paddingLeft: 18, fontSize: 12 }}>{result.impacts.map((line, i) => <li key={i}>{line}</li>)}</ul>
          {error && <p style={{ color: "var(--danger)", fontSize: 11 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => { setResult(null); setChangeText(""); }}><RefreshCcw size={14} />Try another</Button>
            <Button onClick={apply} loading={applying}><Check size={16} />Apply this change to the deal</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function EmailPanel({ deal, setDeal, notify }: { deal: DealRecord; setDeal: (d: DealRecord) => void; notify: (s: string) => void }) {
  const [subject, setSubject] = useState(deal.email?.subject || "");
  const [body, setBody] = useState(deal.email?.body || "");
  const [regenerating, setRegenerating] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try { setDeal(await regenerateEmail(deal.id, deal.extracted, deal.agreement)); }
    catch (e: any) { notify(e.message); }
    finally { setRegenerating(false); }
  };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <b style={{ fontSize: 12 }}>{subject}</b>
        <button onClick={regenerate} style={{ border: 0, background: "none", color: "var(--primary)", fontSize: 10, display: "flex", gap: 4, alignItems: "center" }} disabled={regenerating}><RefreshCcw size={12} className={regenerating ? "animate-spin" : ""} />Regenerate</button>
      </div>
      <p style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--muted-foreground)" }}>{body}</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); notify("Copied."); }}><Copy size={14} />Copy</Button>
        <Button variant="secondary" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }}><Mail size={14} />Open in Mail</Button>
      </div>
    </Card>
  );
}

import type { Screen } from "@/types/armor";

export function DealDetail({ deal, setDeal, notify, go, onDeleted }: {
  deal: DealRecord; setDeal: (d: DealRecord) => void; notify: (s: string) => void; go: (s: Screen) => void; onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const extracted = deal.extracted;
  const buyer = partyLabel(extracted, "Buyer", "Buyer");
  const seller = partyLabel(extracted, "Seller", "Seller");

  const remove = async () => {
    setDeleting(true);
    try { await deleteDeal(deal.id); notify("Deal deleted."); onDeleted(); }
    catch (e: any) { notify(e.message); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DEAL #{deal.id}</span>
          <h2>{deal.deal_name}</h2>
          <p>{buyer} ↔ {seller}</p>
        </div>
        <div className="deal-value"><span>DEAL VALUE</span><b>{extracted.total_value || money(extracted.total_value_numeric, extracted.currency)}</b><StatusBadge status={dealBadge(deal)} /></div>
      </div>
      <button className="back-link" onClick={() => go("deals")}><ArrowLeft size={14} /> Back</button>
      <div className="deal-health">
        <div><span>Generation mode</span><b>{deal.generation_mode === "ai" ? "LLM-Powered" : "Rule-based"}</b><small>Set by server config</small></div>
        <div><span>Created</span><b>{formatDate(deal.created_at)}</b><small>{formatDateTime(deal.created_at)}</small></div>
        <div><span>Last updated</span><b>{formatDate(deal.updated_at)}</b><small>{formatDateTime(deal.updated_at)}</small></div>
        <div>
          <span>Confirmation</span><b>{dealBadge(deal)}</b>
          <small>
            {deal.confirmation_status === "confirmed" && `Confirmed ${formatDate(deal.confirmed_at)}`}
            {deal.confirmation_status === "awaiting_counterparty" && `Shared ${formatDate(deal.shared_at)}`}
            {deal.confirmation_status === "changes_requested" && (deal.change_request || "Changes requested")}
            {deal.confirmation_status === "draft" && "Not yet shared"}
          </small>
        </div>
      </div>

      <DealSummaryCard extracted={extracted} dealName={deal.deal_name} />

      {extracted.conflicts.length > 0 && (
        <section>
          <div className="section-title"><h3>Flagged contradictions</h3></div>
          <div style={{ display: "grid", gap: 10 }}>{extracted.conflicts.map((c, i) => <ConflictCard key={i} conflict={c} />)}</div>
        </section>
      )}

      <section>
        <div className="section-title"><h3>What happens if something changes?</h3><span>Simulated by Armor before you apply it</span></div>
        <WhatIfPanel deal={deal} setDeal={setDeal} notify={notify} />
      </section>

      <section>
        <div className="section-title"><h3>Confirmation email</h3></div>
        <EmailPanel deal={deal} setDeal={setDeal} notify={notify} />
      </section>

      {deal.transcript && (
        <section>
          <div className="section-title"><h3>Source transcript</h3></div>
          <Card style={{ padding: 18, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6 }}>{deal.transcript}</Card>
        </section>
      )}

      <div className="sticky-actions">
        <span><ShieldCheck />Deal {deal.id}</span>
        <Button variant="secondary" onClick={() => go("agreement")}><FileCheck2 size={16} />View Agreement</Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={16} />Delete Deal</Button>
      </div>
      {confirmDelete && (
        <Modal title="Delete this deal?" description="This permanently removes the deal, its transcript and extracted terms." onClose={() => setConfirmDelete(false)}>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={remove}><Trash2 size={16} />Delete</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
