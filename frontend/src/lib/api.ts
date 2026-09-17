// Typed client for the Armor Flask backend (backend/app.py).
//
// This file intentionally mirrors the real endpoints exposed by the backend
// exactly — see backend/app.py and backend/db.py in the armor project. It
// does NOT invent endpoints that don't exist there (e.g. there is no
// "send agreement to counterparty" or "confirm agreement" API, so those UI
// actions stay client-side only and are labelled as such where they appear).
import type {
  ActivityEvent,
  AgreementDoc,
  AuthUser,
  DealRecord,
  DealSummary,
  EmailDraft,
  ExtractedDeal,
  HealthStatus,
  Profile,
  TranscribeResult,
  WhatIfResult,
} from "@/types/armor";

const BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:5000";
export const API_BASE_URL = BASE_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

function json(body: unknown) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } as const;
}

// ── Health ──────────────────────────────────────────────────────────────
export const checkHealth = async () => {
  const res = await fetch(`${BASE_URL}/`);
  return handle<HealthStatus>(res);
};

export const getSampleTranscript = async () => {
  const res = await fetch(`${BASE_URL}/api/sample-transcript`);
  return handle<{ transcript: string }>(res);
};

// ── Auth ────────────────────────────────────────────────────────────────
export const loginUser = async (email: string, password: string) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, json({ email, password }));
  return handle<AuthUser>(res);
};

export const signupUser = async (payload: {
  email: string;
  password: string;
  name: string;
  company_name?: string;
  role?: string;
}) => {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, json(payload));
  return handle<AuthUser>(res);
};

// ── Profile ─────────────────────────────────────────────────────────────
export const getProfile = async (username: string) => {
  const res = await fetch(`${BASE_URL}/api/profile/${encodeURIComponent(username)}`);
  return handle<Profile>(res);
};

export const updateProfile = async (username: string, data: Partial<Profile>) => {
  const res = await fetch(`${BASE_URL}/api/profile/${encodeURIComponent(username)}/update`, json(data));
  return handle<Profile>(res);
};

// ── Transcription ───────────────────────────────────────────────────────
export const transcribeAudio = async (audioBlob: Blob, filename = "recording.webm") => {
  const form = new FormData();
  form.append("audio", audioBlob, filename);
  const res = await fetch(`${BASE_URL}/api/deals/transcribe`, { method: "POST", body: form });
  return handle<TranscribeResult>(res);
};

// ── Deals ───────────────────────────────────────────────────────────────
export const analyzeDeal = async (username: string, transcript: string, dealName = "") => {
  const res = await fetch(
    `${BASE_URL}/api/deals/analyze`,
    json({ username, transcript, deal_name: dealName }),
  );
  return handle<DealRecord>(res);
};

export const listDeals = async (username: string) => {
  const res = await fetch(`${BASE_URL}/api/deals?username=${encodeURIComponent(username)}`);
  return handle<DealSummary[]>(res);
};

export const getDeal = async (dealId: string) => {
  const res = await fetch(`${BASE_URL}/api/deals/${encodeURIComponent(dealId)}`);
  return handle<DealRecord>(res);
};

export const updateDeal = async (
  dealId: string,
  data: Partial<Pick<DealRecord, "deal_name" | "extracted" | "agreement" | "email" | "generation_mode">>,
) => {
  const res = await fetch(`${BASE_URL}/api/deals/${encodeURIComponent(dealId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle<DealRecord>(res);
};

export const deleteDeal = async (dealId: string) => {
  const res = await fetch(`${BASE_URL}/api/deals/${encodeURIComponent(dealId)}`, { method: "DELETE" });
  return handle<{ deleted: boolean }>(res);
};

export const regenerateEmail = async (
  dealId: string,
  extracted: ExtractedDeal,
  agreement: AgreementDoc,
) => {
  const res = await fetch(
    `${BASE_URL}/api/deals/${encodeURIComponent(dealId)}/regenerate-email`,
    json({ extracted, agreement }),
  );
  return handle<DealRecord>(res);
};

// ── What-if simulation ──────────────────────────────────────────────────
export const simulateWhatIf = async (dealId: string, changeText: string) => {
  const res = await fetch(
    `${BASE_URL}/api/deals/${encodeURIComponent(dealId)}/what-if`,
    json({ change_text: changeText }),
  );
  return handle<WhatIfResult>(res);
};

export const applyChange = async (
  dealId: string,
  extracted: ExtractedDeal,
  agreement: AgreementDoc | null,
) => {
  const res = await fetch(`${BASE_URL}/api/deals/${encodeURIComponent(dealId)}/apply-change`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted, agreement }),
  });
  return handle<DealRecord>(res);
};

export type { EmailDraft };

// ── Counterparty confirmation workflow ─────────────────────────────────
export const shareDeal = async (
  dealId: string,
  data: { counterparty_email: string; subject?: string; body?: string },
) => {
  const res = await fetch(`${BASE_URL}/api/deals/${encodeURIComponent(dealId)}/share`, json(data));
  return handle<DealRecord>(res);
};

export const confirmDeal = async (dealId: string) => {
  const res = await fetch(`${BASE_URL}/api/deals/${encodeURIComponent(dealId)}/confirm`, json({}));
  return handle<DealRecord>(res);
};

export const requestDealChanges = async (dealId: string, changeRequest: string) => {
  const res = await fetch(
    `${BASE_URL}/api/deals/${encodeURIComponent(dealId)}/request-changes`,
    json({ change_request: changeRequest }),
  );
  return handle<DealRecord>(res);
};

// ── Activity feed ───────────────────────────────────────────────────────
export const getActivity = async (username: string, limit = 50) => {
  const res = await fetch(`${BASE_URL}/api/activity?username=${encodeURIComponent(username)}&limit=${limit}`);
  return handle<ActivityEvent[]>(res);
};
