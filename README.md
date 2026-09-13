# AgreeFlow AI — Deal Intelligence from Conversations

Turn a raw (even multilingual, code-mixed) negotiation conversation into a
structured, checkable, sendable deal — automatically.

This folder is the complete product: `frontend/` (React) talking to
`backend/` (Flask + CrewAI). See `PROJECT_SUMMARY.md` for what was built,
what was fixed, and why.

---

## 1. Requirements

- **Python** 3.10+ and `pip`
- **Node.js** 18+ and `npm`
- An internet connection (for the AI + speech-to-text APIs, and for
  `npm install` the first time)

---

## 2. Backend setup (Flask API)

```bash
cd backend
python -m venv venv               # optional but recommended
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configure API keys

Open `backend/.env`. It already has working keys pre-filled for this demo
(AssemblyAI for transcription, Gemini for the AI analysis), so it will run
out of the box. To use your own:

```env
STT_PROVIDER=assemblyai
ASSEMBLYAI_API_KEY=your_key_here        # https://www.assemblyai.com/ (free tier available)

LLM_PROVIDER=gemini                     # or: openai | anthropic | grok | ollama
LLM_MODEL=gemini/gemini-2.0-flash
GEMINI_API_KEY=your_key_here
```

If you leave **all** LLM keys blank, the app still works — it automatically
falls back to a fast, deterministic, regex/heuristic analyzer instead of the
AI crew (you'll see an "Heuristic mode" badge in the UI). **Transcription**
(audio → text) always needs a real STT key, since there's no offline
fallback for speech recognition itself.

### Run it

```bash
python app.py
```

The API starts on **http://127.0.0.1:5000**. Visit it in a browser — you
should see a small JSON status block confirming it's alive and whether
AI/STT are configured.

---

## 3. Frontend setup (React app)

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will print a local URL (usually **http://localhost:5173**). Open it —
you should land on the sign-up/login screen, then the "Turn a deal
conversation into a deal" workspace.

By default the frontend talks to `http://127.0.0.1:5000`. If your backend
runs somewhere else, create `frontend/.env`:

```env
VITE_API_URL=http://your-backend-host:5000
```

### Building for production

```bash
npm run build      # outputs to frontend/dist
npm run preview    # serve the production build locally
```

---

## 4. Using it

1. **Sign up** with any email/password (stored locally in the backend's
   SQLite database — this is a demo auth system, not production-grade).
2. On the dashboard, either:
   - **Record** the negotiation live from your mic, or
   - **Upload a recorded call** (any length — WAV/MP3/M4A/OGG/MP4/WEBM), or
   - **Paste or upload a `.txt` transcript** directly, or
   - Click **"Try a sample deal"** to see it working instantly with no
     recording at all.
3. Click **Analyze Deal**. Within a few seconds you'll get:
   - Extracted deal terms
   - The "What exactly did we agree to?" agreement
   - **Deal Conflict Detection** — any contradicting statements, flagged
   - The **Deal Calculator** (advance/balance, adjustable)
   - A **live countdown** to the agreed deadline
   - A ready-to-send **confirmation email** (copy or open in your mail app)
   - **"What happens if something changes?"** — describe a hypothetical
     change and see the recalculated impact before anyone commits to it
4. Every analyzed deal is saved — see them under **Reports**.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| "No speech-to-text key configured" | Add `ASSEMBLYAI_API_KEY` to `backend/.env` |
| Long recordings fail to transcribe | Already fixed in this build — see `PROJECT_SUMMARY.md`. If it still happens, raise `ASSEMBLYAI_TRANSCRIBE_TIMEOUT` (seconds) in `backend/.env` |
| CORS errors in the browser console | Make sure the backend is actually running on port 5000, and `VITE_API_URL` (if set) matches it exactly |
| "Heuristic mode" badge always showing | No LLM key is configured/valid — add one to `backend/.env` under the matching `LLM_PROVIDER` |
| `npm install` fails on a native binding | Delete `frontend/node_modules` and `frontend/package-lock.json`'s platform-specific entries won't matter — just re-run `npm install` on your actual machine; native binaries are fetched per-platform automatically |
