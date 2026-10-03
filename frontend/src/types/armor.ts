// These types mirror exactly what backend/agents/crew.py (EXTRACTION_SCHEMA /
// AGREEMENT_SCHEMA / EMAIL_SCHEMA) and backend/db.py (_deal_to_dict) produce.
// Keep this file in sync with the backend's JSON shapes rather than
// inventing fields the API doesn't actually return.

export type AuthUser = {
  username: string;
  name: string;
  email: string;
  company_name: string;
  role: string;
};

export type Profile = {
  username: string;
  company_name: string;
  role: string;
  default_currency: string;
  default_advance_percent: number;
  notes: string;
};

export type Party = { name: string; role: string };

export type Deadline = { label: string; date: string | null; raw_text: string };

export type ResponsibilityItem = { party: string; responsibility: string };

export type ConflictSeverity = "high" | "medium" | "low";

export type Conflict = {
  topic: string;
  earlier_statement: string;
  later_statement: string;
  values: string[];
  resolved_value: string;
  resolution: string;
  severity: ConflictSeverity;
};

export type BOMItem = {
  part_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  moq?: number | null;
};

export type SupplyTerms = {
  lead_time?: string;
  lead_time_days?: number | null;
  delivery_batches?: string;
  rma_warranty?: string;
  compliance?: string[];
};

export type InventoryItem = {
  id: string;
  mpn: string;
  name: string;
  category: string;
  stock_qty: number;
  min_reorder_level: number;
  standard_unit_price: number;
};

export type StockWarning = {
  type: "insufficient_stock" | "item_not_in_inventory" | "reorder_threshold_triggered";
  part_name: string;
  matched_mpn?: string | null;
  requested_qty: number;
  available_stock: number;
  remaining_stock?: number;
  min_reorder_level?: number;
  severity: "high" | "medium" | "low";
  message: string;
};

export type StockStatusItem = {
  part_name: string;
  mpn: string | null;
  requested_qty: number;
  available_stock: number;
  status: "sufficient" | "insufficient" | "unknown";
  in_catalog: boolean;
};

export type ExtractedDeal = {
  deal_type?: string;
  parties: Party[];
  product_or_service: string;
  quantity: string;
  total_value: string;
  total_value_numeric: number | null;
  currency: string;
  items?: BOMItem[];
  supply_terms?: SupplyTerms;
  payment_terms: string;
  advance_percent: number | null;
  advance_amount: number | null;
  balance_amount: number | null;
  delivery_terms: string;
  deadlines: Deadline[];
  responsibilities: ResponsibilityItem[];
  conditions: string[];
  negotiated_changes: string[];
  conflicts: Conflict[];
  stock_warnings?: StockWarning[];
  stock_status?: StockStatusItem[];
};

export type AgreementSection = { heading: string; content: string };

export type AgreementDoc = {
  title: string;
  summary: string;
  sections: AgreementSection[];
  key_terms: string[];
};

export type EmailDraft = { subject: string; body: string };

export type GenerationMode = "ai" | "fallback";

export type ConfirmationStatus = "draft" | "awaiting_counterparty" | "confirmed" | "changes_requested";

export type SignatureStatus = "draft" | "awaiting_signature" | "signed" | "declined";

// Full deal record — returned by POST /api/deals/analyze, GET /api/deals/<id>,
// PUT /api/deals/<id>, .../regenerate-email, .../apply-change, .../share,
// .../confirm, .../request-changes, .../request-signature.
export type DealRecord = {
  id: string;
  username: string;
  deal_name: string;
  status: string; // backend always sets this to "completed" today
  transcript: string | null;
  extracted: ExtractedDeal;
  agreement: AgreementDoc;
  email: EmailDraft;
  generation_mode: GenerationMode;
  confirmation_status: ConfirmationStatus;
  counterparty_email: string;
  shared_at: string | null;
  confirmed_at: string | null;
  change_request: string;
  signature_status?: SignatureStatus;
  signature_token?: string | null;
  signed_at?: string | null;
  signer_email?: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Only present on the response from POST /api/deals/<id>/share or /request-signature.
  email_sent?: boolean;
  email_provider?: "in_house" | "resend" | "auto" | string;
  email_receipt_id?: string | null;
  email_send_note?: string;
  accept_url?: string;
  decline_url?: string;
};

// Slimmer shape returned by GET /api/deals (list) — no transcript field.
export type DealSummary = Omit<DealRecord, "transcript"> & { transcript: null };

export type TranscribeResult = {
  transcript: string;
  language: string | null;
  confidence: number | null;
  provider: "assemblyai" | "openai" | string;
  diarized: boolean;
};

export type WhatIfResult = {
  change_text: string;
  impacts: string[];
  updated_extracted: ExtractedDeal;
  updated_agreement: AgreementDoc | null;
  mode: string;
};

export type HealthStatus = {
  status: string;
  service: string;
  llm_configured: boolean;
  stt_configured: boolean;
  stt_provider: string;
  email_configured: boolean;
};

export type ActivityEvent = {
  id: number;
  deal_id: string | null;
  event_type: string;
  message: string;
  created_at: string | null;
};

// UI-only helper: a single editable line in the transcript review screen.
// The backend returns transcripts as one plain text blob (optionally
// diarized as "Speaker: line" per line) — there is no per-line id/timestamp/
// confidence from the API, so we synthesize a local id for React keys only.
export type TranscriptLine = { id: string; speaker: string; text: string };

// Badge shown on deal cards/lists — driven by signature_status and confirmation_status
export type DealBadgeStatus =
  | "Draft"
  | "Under Review"
  | "Awaiting Counterparty"
  | "Confirmed"
  | "Changes Requested"
  | "Completed"
  | "Unsigned"
  | "Awaiting Counterparty Signature"
  | "Signed & Legally Accepted"
  | "Rejected by Counterparty";

// UI screen types for navigation
export type Screen =
  | "login" | "signup" | "dashboard" | "new" | "meeting" | "recording" | "transcript" | "analysis"
  | "review" | "agreement" | "counterparty" | "deal" | "deals" | "agreements" | "activity" | "settings" | "inventory";
