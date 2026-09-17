# Armor

Structured deal intelligence from business conversations — an agreeflow-ai
frontend wired to a Flask backend.

```
armor-app/
├── backend/     Flask API — auth, transcription, AI deal extraction, deals,
│                what-if simulation, agreement/email generation, confirmation
│                workflow, activity log.
└── frontend/    TanStack Start / React UI, calling the backend above.
```

## Run it

**Backend**
```bash
cd backend
pip install -r requirements.txt
python app.py          # http://127.0.0.1:5000
```
Add an LLM key (see `backend/.env`) for full AI-powered extraction — without
one, the backend runs in a built-in heuristic fallback mode. Add an STT key
(AssemblyAI or OpenAI) to enable audio transcription. Add SMTP credentials to
have "Share Agreement" actually email the counterparty; without them it still
records the deal as shared and falls back to a mailto: link.

**Frontend**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## What's real vs. not yet built

Every feature in the UI calls a real backend endpoint: auth, audio
recording → transcription, transcript → AI deal analysis, conflict
detection, editing terms, the what-if simulator, regenerating the
confirmation email, sharing/confirming/requesting changes on a deal, and the
activity feed.

Two things are intentionally out of scope rather than faked:
- **Live video meetings** — the "Live Notes" screen gives you a local camera
  self-preview and a note box; there's no real-time video/websocket backend,
  so it doesn't connect to a remote party.
- **A public counterparty link** — confirming or requesting changes updates
  the real deal record, but there's no separate unauthenticated URL yet for
  an external counterparty to click without an Armor account.
