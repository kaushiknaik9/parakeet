import { useState } from "react";
import { ArrowLeft, Calculator, FileText, CheckCircle2, PenLine, Copy, Plus, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { Button, Card, Field, IconButton, Modal } from "../shared/armor-ui";
import { linesToTranscript, transcriptToLines } from "@/lib/format";
import type { TranscriptLine } from "@/types/armor";

import type { Screen } from "@/types/armor";

export function TranscriptWorkspace({ lines, setLines, dealName, setDealName, go, notify, onAnalyze }: {
  lines: TranscriptLine[]; setLines: (r: TranscriptLine[]) => void; dealName: string; setDealName: (v: string) => void;
  go: (s: Screen) => void; notify: (s: string) => void; onAnalyze: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(lines.length === 0);
  const [pasteText, setPasteText] = useState(linesToTranscript(lines));
  const update = (id: string, text: string) => setLines(lines.map((r) => (r.id === id ? { ...r, text } : r)));
  const removeLine = (id: string) => setLines(lines.filter((r) => r.id !== id));
  const addLine = () => setLines([...lines, { id: `manual-${Date.now()}`, speaker: "Speaker", text: "" }]);
  const totalWords = lines.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRANSCRIPT</span>
          <h2>Conversation Transcript</h2>
          <p>Review and correct the conversation before Armor identifies the agreement.</p>
        </div>
        <span className="ai-badge"><CheckCircle2 size={14} />{lines.length} lines</span>
      </div>
      <button className="back-link" onClick={() => go("new")}><ArrowLeft size={14} /> Back</button>
      <div className="summary-bar">
        <span><Calculator /><span>{totalWords}<small>Words</small></span></span>
        <span><FileText /><span>{lines.length}<small>Lines</small></span></span>
        <span><CheckCircle2 /><span>Editable<small>Status</small></span></span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Field label="Deal name (optional)" value={dealName} onChange={(e) => setDealName(e.target.value)} placeholder="e.g. 500 Unit Supply Agreement" />
      </div>
      <div className="transcript-layout">
        <Card className="transcript-editor">
          <div className="editor-toolbar">
            <div><span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center" }}>Line-by-line transcript</span></div>
            <div><IconButton label="Paste raw text" onClick={() => { setPasteText(linesToTranscript(lines)); setPasteOpen(true); }}><PenLine /></IconButton><IconButton label="Copy transcript" onClick={() => { navigator.clipboard.writeText(linesToTranscript(lines)); notify("Transcript copied."); }}><Copy /></IconButton></div>
          </div>
          {lines.map((r) => (
            <div className="transcript-row" key={r.id}>
              <div className="speaker-avatar">{r.speaker.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="speaker-line">
                  <input value={r.speaker} onChange={(e) => setLines(lines.map((x) => (x.id === r.id ? { ...x, speaker: e.target.value } : x)))} style={{ border: 0, background: "transparent", fontWeight: 700, fontSize: 11, width: 120 }} />
                  <button onClick={() => setEditing(editing === r.id ? null : r.id)}><PenLine size={14} />Edit</button>
                  <button onClick={() => removeLine(r.id)}></button>
                </div>
                {editing === r.id
                  ? <textarea value={r.text} onChange={(e) => update(r.id, e.target.value)} onBlur={() => setEditing(null)} autoFocus />
                  : <p>{r.text || <em style={{ color: "var(--muted-foreground)" }}>Empty line</em>}</p>}
              </div>
            </div>
          ))}
          {lines.length === 0 && (
            <div className="empty-inline"><FileText /><h3>No transcript yet</h3><p>Paste one below to get started.</p></div>
          )}
          <div style={{ padding: 16 }}><Button variant="secondary" onClick={addLine}><Plus size={14} />Add line</Button></div>
        </Card>
        <aside className="review-panel">
          <h3>Review checklist</h3>
          <p>Confirm the source conversation before analysis begins.</p>
          {["Participant names", "Quantities and prices", "Payment terms", "Dates and deadlines"].map((s) => (
            <label key={s}><input type="checkbox" defaultChecked /><span><Check size={13} /></span>{s}</label>
          ))}
          <div className="review-note"><ShieldCheck /><p>Your edits become the source of truth for deal analysis.</p></div>
          <Button onClick={onAnalyze}>Continue to Deal Analysis <ArrowRight size={17} /></Button>
        </aside>
      </div>
      {pasteOpen && (
        <Modal title="Paste transcript" description="Paste a speaker-labelled electronics deal transcript (e.g. 'Buyer: ...' / 'Seller: ...'), one line per turn." onClose={() => setPasteOpen(false)}>
          <textarea className="large-input" style={{ minHeight: 220, fontFamily: "monospace" }} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"Buyer: We need 5,000 units of STM32F407VG microcontrollers at ₹450 per unit.\nSeller: Confirmed. Total is ₹22,50,000 with a 3-week lead time and 12-month RMA warranty.\nBuyer: Deal. We'll pay 30% advance on PO issue."} />
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setPasteOpen(false)}>Cancel</Button>
            <Button onClick={() => { setLines(transcriptToLines(pasteText)); setPasteOpen(false); }}><Check size={16} />Use this transcript</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
