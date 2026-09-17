import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

import os
import tempfile
import uuid

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS

from agents import (
    TranscriptionFailed,
    TranscriptionNotConfigured,
    analyze_deal,
    detect_conflicts,
    llm_is_configured,
    regenerate_email,
    simulate_change,
    stt_is_configured,
    stt_provider,
    transcribe_audio,
)
from db import (
    confirm_deal,
    create_deal,
    create_user_auth,
    delete_deal,
    get_deal,
    get_or_create_user,
    get_profile,
    init_db,
    list_activity,
    list_deals,
    normalize_username,
    request_deal_changes,
    share_deal,
    update_deal,
    update_profile,
    verify_user_auth,
)
import email_sender

app = Flask(__name__)
CORS(app)

# Raise Flask/Werkzeug's own request body cap above our own MAX_AUDIO_BYTES
# check below — otherwise the dev server can reject a long recording before
# our code ever gets a chance to return a friendly error.
app.config["MAX_CONTENT_LENGTH"] = 250 * 1024 * 1024  # 250 MB hard ceiling

init_db()

SAMPLE_TRANSCRIPT = """Buyer: Hi, thanks for hopping on the call. Let's finalize the bulk order of wireless earbuds.
Seller: Of course. So we're looking at 500 units of the ANC Pro earbuds at ₹800 per unit, that's ₹4,00,000 total.
Buyer: That works for us. On payment, I'll pay 30% upfront and the rest on delivery.
Seller: Sounds good, so that's ₹1,20,000 advance and ₹2,80,000 balance on delivery.
Buyer: Actually, let's round it — I'll send ₹1,50,000 as advance instead, just to be safe on our end.
Seller: No problem, we'll adjust the balance to ₹2,50,000 then.
Buyer: Great. When can you deliver?
Seller: We can deliver within 15 days, by 30th October, shipped via our logistics partner to your Bangalore warehouse.
Buyer: Perfect. We'll also need a 12 month warranty on all units, and you'll handle any DOA replacements within 7 days.
Seller: Agreed, that's part of our standard terms. We'll also need the advance payment confirmed within 48 hours to lock the manufacturing slot.
Buyer: Understood, I'll get finance to wire it tomorrow. If quality checks fail on the first batch, can we get a partial refund?
Seller: Yes, if more than 5% of a batch fails QC, we'll refund or replace that portion within 10 days.
Buyer: Sounds fair. Let's go ahead with this."""


# ── Health ────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return jsonify(
        {
            "status": "ok",
            "service": "Armour API",
            "llm_configured": llm_is_configured(),
            "stt_configured": stt_is_configured(),
            "stt_provider": stt_provider(),
            "email_configured": email_sender.is_configured(),
        }
    )


@app.get("/api/sample-transcript")
def sample_transcript():
    return jsonify({"transcript": SAMPLE_TRANSCRIPT}), 200


ALLOWED_AUDIO_EXT = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4", ".mpeg", ".mpga"}
# 50MB was cutting off longer negotiation calls (a ~60-90 min opus recording
# can exceed that). Raised to 200MB — still well under our Flask-level
# MAX_CONTENT_LENGTH ceiling above, and AssemblyAI/Whisper both handle files
# this size comfortably.
MAX_AUDIO_BYTES = 200 * 1024 * 1024  # 200 MB


@app.post("/api/deals/transcribe")
def deals_transcribe():
    """
    Accepts an audio recording (multipart/form-data, field name 'audio'),
    transcribes it with speaker diarization, and returns the transcript text.
    This does NOT save a deal — the frontend shows the transcript for review
    before the user runs /api/deals/analyze on it.
    """
    if not stt_is_configured():
        return (
            jsonify(
                {
                    "error": (
                        f"No speech-to-text key configured for provider '{stt_provider()}'. "
                        "Add ASSEMBLYAI_API_KEY (recommended) or OPENAI_API_KEY to backend/.env, "
                        "or paste/upload a transcript instead."
                    )
                }
            ),
            400,
        )

    if "audio" not in request.files:
        return jsonify({"error": "no audio file uploaded (expected form field 'audio')"}), 400

    audio_file = request.files["audio"]
    if not audio_file.filename:
        return jsonify({"error": "empty audio file"}), 400

    ext = os.path.splitext(audio_file.filename)[1].lower() or ".webm"
    if ext not in ALLOWED_AUDIO_EXT:
        ext = ".webm"

    tmp_path = os.path.join(tempfile.gettempdir(), f"armour-audio-{uuid.uuid4().hex}{ext}")
    try:
        audio_file.save(tmp_path)
        if os.path.getsize(tmp_path) == 0:
            return jsonify({"error": "uploaded audio file is empty"}), 400
        if os.path.getsize(tmp_path) > MAX_AUDIO_BYTES:
            return jsonify({"error": "audio file too large (max 50MB)"}), 400

        result = transcribe_audio(tmp_path)
        if not result.get("transcript"):
            return jsonify({"error": "transcription returned empty text — please try again"}), 502
        return jsonify(result), 200

    except TranscriptionNotConfigured as e:
        return jsonify({"error": str(e)}), 400
    except TranscriptionFailed as e:
        return jsonify({"error": f"transcription failed: {str(e)}"}), 502
    except Exception as e:  # noqa: BLE001
        print(f"[deals_transcribe] EXCEPTION: {e}")
        return jsonify({"error": f"transcription failed: {str(e)}"}), 500
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


# ── Auth ──────────────────────────────────────────────────────────────────
@app.post("/api/auth/signup")
def signup():
    payload = request.json or {}
    email = payload.get("email")
    password = payload.get("password")
    name = payload.get("name")
    company_name = payload.get("company_name", "")
    role = payload.get("role", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    result = create_user_auth(email, password, name, company_name, role)
    if "error" in result:
        return jsonify({"error": result["error"]}), 400
    return jsonify(result), 201


@app.post("/api/auth/login")
def login():
    payload = request.json or {}
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    result = verify_user_auth(email, password)
    if "error" in result:
        return jsonify({"error": result["error"]}), 401
    return jsonify(result), 200


# ── Profile ───────────────────────────────────────────────────────────────
@app.get("/api/profile/<username>")
def profile_get(username):
    username = normalize_username(username)
    get_or_create_user(username, display_name=username)
    return jsonify(get_profile(username)), 200


@app.post("/api/profile/<username>/update")
def profile_update(username):
    username = normalize_username(username)
    payload = request.json or {}
    return jsonify(update_profile(username, payload)), 200


# ── Deals ─────────────────────────────────────────────────────────────────
@app.post("/api/deals/analyze")
def deals_analyze():
    payload = request.json or {}
    username = normalize_username(payload.get("username"))
    transcript = str(payload.get("transcript", "") or "").strip()
    deal_name = str(payload.get("deal_name", "") or "").strip()

    if not username:
        return jsonify({"error": "missing username"}), 400
    if not transcript or len(transcript) < 20:
        return jsonify({"error": "transcript is too short to analyze"}), 400

    get_or_create_user(username, display_name=username)

    try:
        result = analyze_deal(transcript)
    except Exception as e:  # noqa: BLE001
        print(f"[deals_analyze] EXCEPTION: {e}")
        return jsonify({"error": f"analysis failed: {str(e)}"}), 500

    extracted = result["extracted"]

    # Deal Conflict Detection: always run the deterministic numeric-contradiction
    # scan as a safety net over whatever the extractor (AI or fallback) produced,
    # merging in anything it might have missed — this is the feature that needs
    # to be "very very very accurate", so we don't rely on the LLM alone for it.
    try:
        heuristic_conflicts = detect_conflicts(transcript, extracted)
    except Exception as e:  # noqa: BLE001
        print(f"[deals_analyze] conflict detection failed: {e}")
        heuristic_conflicts = []
    existing_conflicts = extracted.get("conflicts") or []
    merged = list(existing_conflicts)
    seen_keys = {(c.get("topic"), c.get("earlier_statement"), c.get("later_statement")) for c in merged}
    for c in heuristic_conflicts:
        key = (c.get("topic"), c.get("earlier_statement"), c.get("later_statement"))
        if key not in seen_keys:
            merged.append(c)
            seen_keys.add(key)
    extracted["conflicts"] = merged

    if not deal_name:
        deal_name = extracted.get("product_or_service") or "Untitled Deal"
        deal_name = deal_name[:80]

    deal = create_deal(
        username=username,
        deal_name=deal_name,
        transcript=transcript,
        extracted=extracted,
        agreement=result["agreement"],
        email=result["email"],
        generation_mode=result["mode"],
    )
    return jsonify(deal), 200


@app.get("/api/deals")
def deals_list():
    username = normalize_username(request.args.get("username", ""))
    if not username:
        return jsonify({"error": "missing username"}), 400
    return jsonify(list_deals(username)), 200


@app.get("/api/deals/<deal_id>")
def deals_get(deal_id):
    deal = get_deal(deal_id)
    if not deal:
        return jsonify({"error": "deal not found"}), 404
    return jsonify(deal), 200


@app.put("/api/deals/<deal_id>")
def deals_update(deal_id):
    payload = request.json or {}
    deal = update_deal(deal_id, payload)
    if not deal:
        return jsonify({"error": "deal not found"}), 404
    return jsonify(deal), 200


@app.delete("/api/deals/<deal_id>")
def deals_delete(deal_id):
    ok = delete_deal(deal_id)
    if not ok:
        return jsonify({"error": "deal not found"}), 404
    return jsonify({"deleted": True}), 200


@app.post("/api/deals/<deal_id>/regenerate-email")
def deals_regenerate_email(deal_id):
    deal = get_deal(deal_id)
    if not deal:
        return jsonify({"error": "deal not found"}), 404

    payload = request.json or {}
    extracted = payload.get("extracted") or deal["extracted"]
    agreement = payload.get("agreement") or deal["agreement"]

    try:
        email = regenerate_email(extracted, agreement)
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": f"failed to regenerate email: {str(e)}"}), 500

    updated = update_deal(deal_id, {"extracted": extracted, "email": email})
    return jsonify(updated), 200


@app.post("/api/deals/<deal_id>/what-if")
def deals_what_if(deal_id):
    """
    'What happens if something changes?' — takes a natural-language change
    statement (e.g. "make it 600 units instead of 500") and recomputes the
    downstream impact on quantity/value/payment split/deadlines WITHOUT
    mutating the saved deal. The frontend shows this as a preview the user
    can then choose to "Apply" (which calls PUT /api/deals/<id> separately).
    """
    deal = get_deal(deal_id)
    if not deal:
        return jsonify({"error": "deal not found"}), 404

    payload = request.json or {}
    change_text = str(payload.get("change_text", "") or "").strip()
    if not change_text:
        return jsonify({"error": "missing change_text"}), 400
    if len(change_text) > 2000:
        return jsonify({"error": "change_text is too long"}), 400

    try:
        result = simulate_change(deal["extracted"], deal["agreement"], change_text)
    except Exception as e:  # noqa: BLE001
        print(f"[deals_what_if] EXCEPTION: {e}")
        return jsonify({"error": f"simulation failed: {str(e)}"}), 500

    return jsonify(result), 200


@app.put("/api/deals/<deal_id>/apply-change")
def deals_apply_change(deal_id):
    """Persists a previously-simulated what-if result as the deal's new state."""
    deal = get_deal(deal_id)
    if not deal:
        return jsonify({"error": "deal not found"}), 404

    payload = request.json or {}
    new_extracted = payload.get("extracted")
    new_agreement = payload.get("agreement")
    if not new_extracted:
        return jsonify({"error": "missing extracted"}), 400

    try:
        email = regenerate_email(new_extracted, new_agreement or deal["agreement"])
    except Exception as e:  # noqa: BLE001
        print(f"[deals_apply_change] email regen failed: {e}")
        email = deal["email"]

    updated = update_deal(
        deal_id,
        {
            "extracted": new_extracted,
            "agreement": new_agreement or deal["agreement"],
            "email": email,
        },
    )
    return jsonify(updated), 200


# ── Counterparty confirmation workflow ─────────────────────────────────────
@app.post("/api/deals/<deal_id>/share")
def deals_share(deal_id):
    """Marks the deal as sent for counterparty confirmation, and — if SMTP is
    configured in .env — actually emails the drafted confirmation. If SMTP
    isn't configured, the deal is still marked as shared (email_sent: false)
    so the frontend can fall back to a mailto:/copy flow."""
    deal = get_deal(deal_id)
    if not deal:
        return jsonify({"error": "deal not found"}), 404

    payload = request.json or {}
    counterparty_email = str(payload.get("counterparty_email", "") or "").strip()
    subject = str(payload.get("subject") or deal["email"].get("subject") or "Deal Agreement")
    body = str(payload.get("body") or deal["email"].get("body") or "")

    send_result = email_sender.send_email(counterparty_email, subject, body)
    updated = share_deal(deal_id, counterparty_email)
    if updated is None:
        return jsonify({"error": "deal not found"}), 404

    updated["email_sent"] = send_result["sent"]
    updated["email_send_note"] = send_result["reason"]
    return jsonify(updated), 200


@app.post("/api/deals/<deal_id>/confirm")
def deals_confirm(deal_id):
    """Counterparty (or you, on their behalf) confirms the agreed terms."""
    updated = confirm_deal(deal_id)
    if not updated:
        return jsonify({"error": "deal not found"}), 404
    return jsonify(updated), 200


@app.post("/api/deals/<deal_id>/request-changes")
def deals_request_changes(deal_id):
    payload = request.json or {}
    change_request = str(payload.get("change_request", "") or "").strip()
    if not change_request:
        return jsonify({"error": "missing change_request"}), 400
    updated = request_deal_changes(deal_id, change_request)
    if not updated:
        return jsonify({"error": "deal not found"}), 404
    return jsonify(updated), 200


# ── Activity feed ────────────────────────────────────────────────────────
@app.get("/api/activity")
def activity_list():
    username = normalize_username(request.args.get("username", ""))
    if not username:
        return jsonify({"error": "missing username"}), 400
    limit = min(int(request.args.get("limit", 50) or 50), 200)
    return jsonify(list_activity(username, limit=limit)), 200


# ── Error handlers ────────────────────────────────────────────────────────
@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(500)
def handle_http_error(error):
    return jsonify({"error": f"http error {error.code}: {error.description}"}), error.code


@app.errorhandler(Exception)
def handle_exception(error):
    status_code = getattr(error, "code", 500)
    if not isinstance(status_code, int):
        status_code = 500
    print(f"[EXCEPTION_HANDLER] {type(error).__name__}: {str(error)}")
    import traceback

    traceback.print_exc()
    return jsonify({"error": f"server error: {str(error)}", "type": type(error).__name__}), status_code


if __name__ == "__main__":
    if not llm_is_configured():
        print(
            "[WARN] No LLM API key found in .env — running in FALLBACK mode "
            "(heuristic extraction). Add an API key to backend/.env for full AI analysis."
        )
    # threaded=True so a slow/long-running request (e.g. transcribing a long
    # audio file, which can legitimately take minutes) doesn't block every
    # other request on the single dev-server thread.
    app.run(debug=False, port=5000, threaded=True)
