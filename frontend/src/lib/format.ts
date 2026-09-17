import type { TranscriptLine } from "@/types/armor";

const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

export function money(amount: number | null | undefined, currency = "INR"): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const locale = CURRENCY_LOCALE[currency] || "en-IN";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

let lineCounter = 0;
function nextLineId() {
  lineCounter += 1;
  return `line-${Date.now()}-${lineCounter}`;
}

// Splits a raw transcript blob (what the backend actually returns — plain
// text, optionally with "Speaker: text" per line) into editable lines for
// the transcript review screen. No timestamps or per-line confidence are
// invented since the API doesn't provide them.
export function transcriptToLines(raw: string): TranscriptLine[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map((line) => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9 ._-]{0,39}):\s*(.*)$/);
    if (match && match[1] && match[2] !== undefined) {
      return { id: nextLineId(), speaker: match[1].trim(), text: match[2].trim() };
    }
    return { id: nextLineId(), speaker: "Speaker", text: line };
  });
}

export function linesToTranscript(lines: TranscriptLine[]): string {
  return lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
}
