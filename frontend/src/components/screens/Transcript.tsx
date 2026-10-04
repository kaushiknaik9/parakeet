import { useState } from "react";
import {
  ArrowLeft,
  Calculator,
  FileText,
  CheckCircle2,
  PenLine,
  Copy,
  Plus,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button, Card, Field, IconButton, Modal } from "../shared/armor-ui";
import { EditorialHeading } from "../shared/DesignComponents";
import { linesToTranscript, transcriptToLines } from "@/lib/format";
import type { TranscriptLine, Screen } from "@/types/armor";

export function TranscriptWorkspace({
  lines,
  setLines,
  dealName,
  setDealName,
  go,
  notify,
  onAnalyze,
}: {
  lines: TranscriptLine[];
  setLines: (r: TranscriptLine[]) => void;
  dealName: string;
  setDealName: (v: string) => void;
  go: (s: Screen) => void;
  notify: (s: string) => void;
  onAnalyze: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(lines.length === 0);
  const [pasteText, setPasteText] = useState(linesToTranscript(lines));

  const update = (id: string, text: string) =>
    setLines(lines.map((r) => (r.id === id ? { ...r, text } : r)));
  const removeLine = (id: string) => setLines(lines.filter((r) => r.id !== id));
  const addLine = () =>
    setLines([...lines, { id: `manual-${Date.now()}`, speaker: "Speaker", text: "" }]);

  const totalWords = lines.reduce(
    (n, l) => n + l.text.split(/\s+/).filter(Boolean).length,
    0
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Editorial Header */}
      <EditorialHeading
        kicker="CONVERSATION AUDIT · STEP 02"
        title="Review &amp; verify the transcript."
        subtitle="Ensure speaker labels, quantities, pricing remarks, and delivery terms are accurate before Armor begins neural entity extraction and contradiction detection."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="back-link"
              onClick={() => go("new")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: 0,
                color: "var(--muted-foreground)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <Button onClick={onAnalyze} style={{ height: 40, padding: "0 18px", fontSize: 13 }}>
              Run Deal Analysis <ArrowRight size={15} />
            </Button>
          </div>
        }
      />

      {/* Summary Chips Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--navy-soft)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 20px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <FileText size={16} className="text-primary" />
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{lines.length}</span>
          <span style={{ color: "var(--muted-foreground)" }}>Dialogue Turns</span>
        </span>
        <span style={{ width: 1, height: 16, background: "var(--border)" }} />
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <Calculator size={16} className="text-primary" />
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{totalWords}</span>
          <span style={{ color: "var(--muted-foreground)" }}>Words Spoken</span>
        </span>
        <span style={{ width: 1, height: 16, background: "var(--border)" }} />
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <CheckCircle2 size={16} className="text-success" />
          <span style={{ color: "var(--success-text)", fontWeight: 600 }}>Editable Transcript</span>
        </span>
      </div>

      {/* Optional Deal Title Input */}
      <div style={{ maxWidth: 560 }}>
        <Field
          label="Deal Title (Optional)"
          value={dealName}
          onChange={(e) => setDealName(e.target.value)}
          placeholder="e.g. 500 Unit Supply Agreement — Earbuds Bulk Order"
        />
      </div>

      {/* Main Workspace Split: Left Dialogue Stream, Right Intelligence & Checklist */}
      <div
        className="transcript-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: Speaker Line-by-Line Editor */}
        <Card
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
            padding: 0,
          }}
        >
          {/* Editor Sub-Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--navy-soft)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
              }}
            >
              Dialogue Turns &amp; Speaker Attribution
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <IconButton
                label="Paste raw transcript"
                onClick={() => {
                  setPasteText(linesToTranscript(lines));
                  setPasteOpen(true);
                }}
                style={{ width: 30, height: 30 }}
              >
                <PenLine size={14} />
              </IconButton>
              <IconButton
                label="Copy transcript"
                onClick={() => {
                  navigator.clipboard.writeText(linesToTranscript(lines));
                  notify("Transcript copied to clipboard.");
                }}
                style={{ width: 30, height: 30 }}
              >
                <Copy size={14} />
              </IconButton>
            </div>
          </div>

          {/* Lines List */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {lines.map((r, idx) => {
              const isBuyer =
                r.speaker.toLowerCase().includes("buyer") ||
                r.speaker.toLowerCase().includes("client");
              const isSeller =
                r.speaker.toLowerCase().includes("seller") ||
                r.speaker.toLowerCase().includes("vendor");

              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    gap: 16,
                    padding: "16px 20px",
                    borderBottom: idx < lines.length - 1 ? "1px solid var(--border)" : "none",
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  {/* Speaker Avatar Badge */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: isBuyer
                        ? "rgba(47, 129, 247, 0.15)"
                        : isSeller
                        ? "rgba(56, 189, 248, 0.15)"
                        : "var(--navy-soft)",
                      color: isBuyer
                        ? "var(--primary)"
                        : isSeller
                        ? "#38BDF8"
                        : "var(--muted-foreground)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 12,
                      flexShrink: 0,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {r.speaker.slice(0, 1).toUpperCase()}
                  </div>

                  {/* Turn Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <input
                        value={r.speaker}
                        onChange={(e) =>
                          setLines(
                            lines.map((x) =>
                              x.id === r.id ? { ...x, speaker: e.target.value } : x
                            )
                          )
                        }
                        style={{
                          border: 0,
                          background: "transparent",
                          fontWeight: 700,
                          fontSize: 12,
                          color: "var(--foreground)",
                          width: 140,
                          padding: 0,
                        }}
                      />
                      <button
                        onClick={() => setEditing(editing === r.id ? null : r.id)}
                        style={{
                          background: "none",
                          border: 0,
                          color: "var(--muted-foreground)",
                          fontSize: 11,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        <PenLine size={12} />
                        {editing === r.id ? "Done" : "Edit"}
                      </button>
                      <button
                        onClick={() => removeLine(r.id)}
                        title="Delete line"
                        style={{
                          background: "none",
                          border: 0,
                          color: "var(--muted-foreground)",
                          cursor: "pointer",
                          marginLeft: "auto",
                          padding: 4,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {editing === r.id ? (
                      <textarea
                        value={r.text}
                        onChange={(e) => update(r.id, e.target.value)}
                        onBlur={() => setEditing(null)}
                        autoFocus
                        rows={3}
                        style={{
                          width: "100%",
                          fontSize: 13,
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--navy-soft)",
                          color: "var(--foreground)",
                          padding: 10,
                          fontFamily: "inherit",
                        }}
                      />
                    ) : (
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--foreground)",
                          lineHeight: 1.55,
                          margin: 0,
                        }}
                      >
                        {r.text || (
                          <em style={{ color: "var(--muted-foreground)" }}>Empty statement</em>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {lines.length === 0 && (
              <div style={{ padding: 40, textAlign: "center" }}>
                <FileText size={32} style={{ color: "var(--muted-foreground)", margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>No dialogue turns present</h3>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 16px" }}>
                  Paste raw text or insert a dialogue turn manually.
                </p>
              </div>
            )}
          </div>

          {/* Add Line Button */}
          <div style={{ padding: 16, borderTop: "1px solid var(--border)", background: "var(--navy-soft)" }}>
            <Button
              variant="secondary"
              onClick={addLine}
              style={{ fontSize: 12, height: 34 }}
            >
              <Plus size={14} /> Add Dialogue Turn
            </Button>
          </div>
        </Card>

        {/* Right: Pre-Flight Checklist & Intelligence Summary */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "sticky",
            top: 80,
          }}
        >
          <Card
            style={{
              padding: 22,
              borderRadius: 16,
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
              Pre-Flight Checklist
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
              Armor relies on clear commercial landmarks to spot contradictions accurately.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[
                "Parties & Speaker Roles identified",
                "Deliverables, volumes & unit prices",
                "Payment timeline & advance percentages",
                "Delivery schedules & warranty promises",
              ].map((item) => (
                <label
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12,
                    cursor: "pointer",
                    color: "var(--foreground)",
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: 12,
                borderRadius: 8,
                background: "var(--navy-soft)",
                border: "1px solid var(--border)",
                fontSize: 11,
                color: "var(--muted-foreground)",
                marginBottom: 20,
              }}
            >
              <ShieldCheck size={16} className="text-primary" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Your audited transcript becomes the immutable source of truth for the agreement generator.
              </span>
            </div>

            <Button
              onClick={onAnalyze}
              style={{ width: "100%", justifyContent: "center", height: 42, fontSize: 13 }}
            >
              Analyze Deal Terms <ArrowRight size={16} />
            </Button>
          </Card>
        </aside>
      </div>

      {/* Raw Paste Modal */}
      {pasteOpen && (
        <Modal
          title="Paste Raw Conversation Transcript"
          description="Paste turns formatted as 'Speaker: statement' (e.g. 'Buyer: We need 500 units at ₹800'). One turn per line."
          onClose={() => setPasteOpen(false)}
        >
          <textarea
            className="large-input"
            style={{
              minHeight: 240,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.5,
              borderRadius: 8,
              border: "1px solid var(--border)",
              padding: 12,
            }}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              "Buyer: Let's finalize the order — 500 units at ₹800 each.\nSeller: That is ₹4,00,000 total. We require 30% upfront advance payment.\nBuyer: Deal. Delivery in 3 weeks with 12 months replacement warranty."
            }
          />
          <div className="modal-actions" style={{ marginTop: 18 }}>
            <Button variant="secondary" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setLines(transcriptToLines(pasteText));
                setPasteOpen(false);
              }}
            >
              <Check size={16} /> Load Into Workspace
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
