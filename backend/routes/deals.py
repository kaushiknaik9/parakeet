import logging
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
    request_signature,
    share_deal,
    sign_deal,
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
    validate_electronics_deal_intent,
    validate_electronics_deal_sanity,
)

logger = logging.getLogger(__name__)


def generate_concise_deal_title(deal_id: str, extracted: dict) -> str:
    short_id = deal_id[:4].upper() if deal_id else uuid.uuid4().hex[:4].upper()
    items = extracted.get("items") or []
    part_names = [it.get("part_name") for it in items if it.get("part_name")]
    
    if not part_names and extracted.get("product_or_service"):
        part_names = [extracted.get("product_or_service")]
        
    category = "Electronics Procurement"
    if items:
        cats = [it.get("category") for it in items if it.get("category")]
        if cats:
            first_cat = cats[0]
            category = f"{first_cat} Batch" if "Batch" not in first_cat and "Run" not in first_cat else first_cat
            
    key_comp = " & ".join(part_names[:2]) if part_names else "Component Order"
    return f"PO-{short_id}: {category} ({key_comp})"


def register_deals_routes(app):
    @app.post("/api/deals/transcribe")
    def deals_transcribe():
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
            logger.error("deals_transcribe failed: %s", e)
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
        user_deal_name = str(payload.get("deal_name", "") or "").strip()

        if not username:
            return jsonify({"error": "missing username"}), 400
        if not transcript or len(transcript) < 15:
            return jsonify({"error": "transcript is too short to analyze"}), 400

        # 1. Early-Exit Conversation Guardrail & Intent Filter
        guardrail = validate_electronics_deal_intent(transcript)
        if not guardrail.get("valid_deal", True):
            reason = guardrail.get("reason", "No commercial electronics agreement detected. Armor only processes B2B hardware and component agreements.")
            return jsonify({
                "valid_deal": False,
                "error": reason,
                "reason": reason
            }), 422

        get_or_create_user(username, display_name=username)

        try:
            result = analyze_deal(transcript)
        except Exception as e:  # noqa: BLE001
            logger.error("deals_analyze failed: %s", e)
            return jsonify({"error": f"analysis failed: {str(e)}"}), 500

        extracted = result["extracted"]

        # 2. Electronics Sanity Engine & Heuristic Conflict Scanner
        try:
            heuristic_conflicts = detect_conflicts(transcript, extracted)
        except Exception as e:  # noqa: BLE001
            logger.warning("conflict detection warning: %s", e)
            heuristic_conflicts = []

        try:
            sanity_conflicts = validate_electronics_deal_sanity(extracted, transcript)
        except Exception as e:  # noqa: BLE001
            logger.warning("sanity validation warning: %s", e)
            sanity_conflicts = []

        existing_conflicts = extracted.get("conflicts") or []
        merged = list(existing_conflicts)
        seen_keys = {(c.get("topic"), c.get("earlier_statement"), c.get("later_statement")) for c in merged}
        
        for c in heuristic_conflicts + sanity_conflicts:
            key = (c.get("topic"), c.get("earlier_statement"), c.get("later_statement"))
            if key not in seen_keys:
                merged.append(c)
                seen_keys.add(key)
        extracted["conflicts"] = merged

        deal_id_prefix = uuid.uuid4().hex[:4].upper()
        if user_deal_name and len(user_deal_name) < 50 and not user_deal_name.lower().startswith("untitled"):
            final_deal_name = f"PO-{deal_id_prefix}: {user_deal_name}"
        else:
            final_deal_name = generate_concise_deal_title(deal_id_prefix, extracted)

        deal = create_deal(
            username=username,
            deal_name=final_deal_name,
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
            logger.error("deals_what_if failed: %s", e)
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
            logger.warning("deals_apply_change email regen warning: %s", e)
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

    @app.post("/api/deals/<deal_id>/request-signature")
    def deals_request_signature(deal_id):
        deal = get_deal(deal_id)
        if not deal:
            return jsonify({"error": "deal not found"}), 404

        payload = request.json or {}
        counterparty_email = str(payload.get("counterparty_email", "") or "").strip()
        if not counterparty_email and deal.get("counterparty_email"):
            counterparty_email = deal["counterparty_email"]

        updated = request_signature(deal_id, counterparty_email)
        if not updated:
            return jsonify({"error": "failed to generate signature request"}), 500

        token = updated.get("signature_token") or ""
        accept_url = f"http://localhost:5000/api/deals/{deal_id}/sign?token={token}&action=accept"
        decline_url = f"http://localhost:5000/api/deals/{deal_id}/sign?token={token}&action=decline"

        subject = str(payload.get("subject") or f"E-Signature Request: {updated['deal_name']}")
        body = str(payload.get("body") or f"Please review and sign the agreement for {updated['deal_name']}.\n\nAccept: {accept_url}\nDecline: {decline_url}")

        send_result = email_service.send_signature_email(
            to_address=counterparty_email,
            deal_id=deal_id,
            deal_name=updated["deal_name"],
            signature_token=token,
            subject=subject,
            body=body,
            deal=updated,
        )

        updated["email_sent"] = send_result.get("sent", False)
        updated["email_send_note"] = send_result.get("reason", "")
        updated["accept_url"] = accept_url
        updated["decline_url"] = decline_url
        return jsonify(updated), 200

    @app.get("/api/deals/<deal_id>/sign")
    def deals_sign(deal_id):
        token = request.args.get("token", "").strip()
        action = request.args.get("action", "").strip().lower()

        if not token:
            html = render_signature_html_page(
                title="Signature Link Invalid",
                subtitle="The signature token is missing or invalid. Please check your link.",
                is_success=False,
                deal_id=deal_id,
            )
            return html, 400

        if action not in ("accept", "decline"):
            html = render_signature_html_page(
                title="Invalid Action",
                subtitle="Unknown action requested. Expected action=accept or action=decline.",
                is_success=False,
                deal_id=deal_id,
            )
            return html, 400

        updated, err = sign_deal(deal_id, token, action)
        if err:
            html = render_signature_html_page(
                title="Signature Request Error",
                subtitle=err,
                is_success=False,
                deal_id=deal_id,
            )
            status_code = 404 if "not found" in err.lower() else 400
            return html, status_code

        if action == "accept":
            html = render_signature_html_page(
                title="Agreement Digitally Confirmed",
                subtitle="Your electronic signature has been verified and registered in the Armor deal ledger.",
                is_success=True,
                deal_id=deal_id,
                deal_name=updated.get("deal_name"),
                signed_at=updated.get("signed_at"),
            )
        else:
            html = render_signature_html_page(
                title="Signature Declined",
                subtitle="You have declined the agreement. The requester has been notified.",
                is_success=False,
                deal_id=deal_id,
                deal_name=updated.get("deal_name"),
            )
        return html, 200


def render_signature_html_page(title: str, subtitle: str, is_success: bool, deal_id: str = None, deal_name: str = None, signed_at: str = None):
    from datetime import datetime
    badge_color = "#22C55E" if is_success else "#EF4444"
    badge_bg = "rgba(34, 197, 94, 0.15)" if is_success else "rgba(239, 68, 68, 0.15)"
    icon_symbol = "&#10003;" if is_success else "&#10007;"
    redirect_url = f"http://localhost:5173/deals/{deal_id}" if deal_id else "http://localhost:5173"
    timestamp_str = signed_at or (datetime.utcnow().isoformat() + "Z")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | Armor E-Signature</title>
    <style>
        :root {{
            --bg: #0B0F17;
            --card: #151C28;
            --border: #2A364F;
            --fg: #F8FAFC;
            --muted: #94A3B8;
            --primary: #2563EB;
            --primary-hover: #1D4ED8;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background-color: var(--bg);
            color: var(--fg);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }}
        .card {{
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
            max-width: 480px;
            width: 100%;
            padding: 36px;
            text-align: center;
        }}
        .brand {{
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.14em;
            color: var(--primary);
            text-transform: uppercase;
            margin-bottom: 24px;
        }}
        .icon-circle {{
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: {badge_bg};
            color: {badge_color};
            font-size: 32px;
            font-weight: bold;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px auto;
            border: 1px solid {badge_color};
        }}
        h1 {{
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 10px;
            color: var(--fg);
        }}
        p {{
            font-size: 13px;
            color: var(--muted);
            line-height: 1.6;
            margin-bottom: 24px;
        }}
        .details-box {{
            background: #0F172A;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 16px;
            text-align: left;
            margin-bottom: 24px;
            font-size: 13px;
        }}
        .details-row {{
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px dashed #1E293B;
        }}
        .details-row:last-child {{ border-bottom: none; }}
        .details-row span {{ color: var(--muted); }}
        .details-row b {{ color: var(--fg); font-family: monospace; font-size: 12px; }}
        .btn {{
            display: inline-block;
            width: 100%;
            background: var(--primary);
            color: #FFFFFF;
            font-weight: 700;
            font-size: 14px;
            padding: 13px;
            border-radius: 8px;
            text-decoration: none;
            transition: background 0.2s ease;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }}
        .btn:hover {{
            background: var(--primary-hover);
        }}
        .redirect-notice {{
            font-size: 11px;
            color: var(--muted);
            margin-top: 14px;
        }}
    </style>
    <script>
      setTimeout(() => {{ window.location.href = "{redirect_url}"; }}, 3000);
    </script>
</head>
<body>
    <div class="card">
        <div class="brand">ARMOR E-SIGNATURE CONFIRMATION</div>
        <div class="icon-circle">{icon_symbol}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {(
            "<div class='details-box'>"
            + (f"<div class='details-row'><span>Deal Agreement:</span><b>{deal_name}</b></div>" if deal_name else "")
            + (f"<div class='details-row'><span>Deal Reference ID:</span><b>{deal_id}</b></div>" if deal_id else "")
            + (f"<div class='details-row'><span>Confirmation Timestamp:</span><b>{timestamp_str}</b></div>")
            + (f"<div class='details-row'><span>Signature Status:</span><b style='color:{badge_color}'>{'Confirmed & Signed' if is_success else 'Declined'}</b></div>")
            + "</div>"
        ) if (deal_id or deal_name) else ""}
        <a href="{redirect_url}" class="btn">Open Armor Dashboard</a>
        <p class="redirect-notice">Redirecting to Armor in 3 seconds...</p>
    </div>
</body>
</html>"""
    return html
