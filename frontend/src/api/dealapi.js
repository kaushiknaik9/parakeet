const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

async function handle(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────
export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
};

export const signupUser = async (userData) => {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  return handle(res);
};

// ── Profile ──────────────────────────────────────────────────────────────
export const getProfile = async (username) => {
  const res = await fetch(`${BASE_URL}/api/profile/${username}`);
  return handle(res);
};

export const updateProfile = async (username, data) => {
  const res = await fetch(`${BASE_URL}/api/profile/${username}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(res);
};

// ── Transcription ────────────────────────────────────────────────────────
export const transcribeAudio = async (audioBlob, filename = "recording.webm") => {
  const form = new FormData();
  form.append("audio", audioBlob, filename);
  const res = await fetch(`${BASE_URL}/api/deals/transcribe`, {
    method: "POST",
    body: form,
  });
  return handle(res);
};

// ── Deals ────────────────────────────────────────────────────────────────
export const getSampleTranscript = async () => {
  const res = await fetch(`${BASE_URL}/api/sample-transcript`);
  return handle(res);
};

export const analyzeDeal = async (username, transcript, dealName = "") => {
  const res = await fetch(`${BASE_URL}/api/deals/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, transcript, deal_name: dealName }),
  });
  return handle(res);
};

export const listDeals = async (username) => {
  const res = await fetch(`${BASE_URL}/api/deals?username=${encodeURIComponent(username)}`);
  return handle(res);
};

export const getDeal = async (dealId) => {
  const res = await fetch(`${BASE_URL}/api/deals/${dealId}`);
  return handle(res);
};

export const updateDeal = async (dealId, data) => {
  const res = await fetch(`${BASE_URL}/api/deals/${dealId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle(res);
};

export const deleteDeal = async (dealId) => {
  const res = await fetch(`${BASE_URL}/api/deals/${dealId}`, { method: "DELETE" });
  return handle(res);
};

export const regenerateEmail = async (dealId, extracted, agreement) => {
  const res = await fetch(`${BASE_URL}/api/deals/${dealId}/regenerate-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted, agreement }),
  });
  return handle(res);
};

// ── What-if simulation ──────────────────────────────────────────────────
export const simulateWhatIf = async (dealId, changeText) => {
  const res = await fetch(`${BASE_URL}/api/deals/${dealId}/what-if`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ change_text: changeText }),
  });
  return handle(res);
};

export const applyChange = async (dealId, extracted, agreement) => {
  const res = await fetch(`${BASE_URL}/api/deals/${dealId}/apply-change`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted, agreement }),
  });
  return handle(res);
};

export const checkHealth = async () => {
  const res = await fetch(`${BASE_URL}/`);
  return handle(res);
};
