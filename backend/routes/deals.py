import os
import tempfile
import uuid

from flask import jsonify, request
from config import ALLOWED_AUDIO_EXT, MAX_AUDIO_BYTES
from models import (
    confirm_deal,
    create_deal,
    delete_deal,
    get_deal,
    get_or_create_user,
    list_deals,
    normalize_username,
    request_deal_changes,
    share_deal,
    update_deal,
)
from services import email_service
from services.ai import (
    TranscriptionFailed,
    TranscriptionNotConfigured,
    analyze_deal,
    detect_conflicts,
    regenerate_email,
    simulate_change,
    stt_is_configured,
    stt_provider,
    transcribe_audio,
)


def register_deals_routes(app):
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

        send_result = email_service.send_email(counterparty_email, subject, body)
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
