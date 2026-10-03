import logging
import os
import tempfile
import uuid

from flask import jsonify, request
from config import ALLOWED_AUDIO_EXT, MAX_AUDIO_BYTES
from models import (
    check_stock_availability,
    confirm_deal,
    create_deal,
    deduct_inventory_stock,
    delete_deal,
    find_deal_by_docuseal_id,
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
from services import docuseal_service, email_service
from services.ai import (
    TranscriptionFailed,
    TranscriptionNotConfigured,
    analyze_deal,
    detect_conflicts,
    enforce_mathematical_invariants,
    normalize_transcript_for_procurement,
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


def _resolve_speaker_names(extracted: dict, transcript: str) -> dict:
    import re
    parties = extracted.get("parties") or []
    spoken_names = []
    for match in re.finditer(r"\b(?:namaste|hi|hello|hey|thanks|thank\s+you|haan|ji)\s+([A-Z][a-z]{2,15})\b", transcript, re.IGNORECASE):
        candidate = match.group(1).capitalize()
        if candidate.lower() not in {"there", "team", "everyone", "sir", "madam", "ji", "humein", "rate"} and candidate not in spoken_names:
            spoken_names.append(candidate)

    updated_parties = []
    for idx, p in enumerate(parties):
        p_name = p.get("name", "").strip()
        p_role = p.get("role", "").strip()
        is_generic = not p_name or bool(re.match(r"^(speaker|party|user)\s*[a-z0-9_]*$", p_name, re.IGNORECASE))
        
        if is_generic:
            assigned_name = spoken_names[idx] if idx < len(spoken_names) else ("Procurement Representative" if idx == 0 else "Supplier Representative")
        else:
            assigned_name = p_name

        if not p_role or p_role in ("Party", "Party A", "Party B"):
            p_role = "Buyer" if idx == 0 else "Seller"
            
        updated_parties.append({"name": assigned_name, "role": p_role})

    if not updated_parties:
        b_name = spoken_names[0] if len(spoken_names) > 0 else "Procurement Representative"
        s_name = spoken_names[1] if len(spoken_names) > 1 else "Supplier Representative"
        updated_parties = [{"name": b_name, "role": "Buyer"}, {"name": s_name, "role": "Seller"}]

    extracted["parties"] = updated_parties
    return extracted


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
        raw_transcript = str(payload.get("transcript", "") or "").strip()
        user_deal_name = str(payload.get("deal_name", "") or "").strip()

        if not username:
            return jsonify({"error": "missing username"}), 400
        if not raw_transcript or len(raw_transcript) < 15:
            return jsonify({"error": "transcript is too short to analyze"}), 400

        # 1. Normalize Indic script & multilingual code-mixed speech into English procurement terms
        transcript = normalize_transcript_for_procurement(raw_transcript)

        # 2. Early-Exit Conversation Guardrail & Intent Filter
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

        extracted = _resolve_speaker_names(result["extracted"], transcript)
        extracted = enforce_mathematical_invariants(extracted)

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

        # Real-Time Inventory Stock Check
        try:
            stock_res = check_stock_availability(extracted.get("items") or [])
            extracted["stock_warnings"] = stock_res.get("warnings") or []
            extracted["stock_status"] = stock_res.get("stock_status") or []
        except Exception as e:  # noqa: BLE001
            logger.warning("stock check warning: %s", e)
            extracted["stock_warnings"] = []
            extracted["stock_status"] = []

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

        # Lightweight check against DocuSeal if awaiting signature & docuseal_id present
        docuseal_id = deal.get("docuseal_id") or (deal.get("agreement") or {}).get("docuseal_submission_id")
        if deal.get("signature_status") == "awaiting_signature" and docuseal_id:
            try:
                st_check = docuseal_service.check_docuseal_submission_status(docuseal_id)
                if st_check.get("is_completed"):
                    token = deal.get("signature_token") or "docuseal"
                    updated, _ = sign_deal(deal_id, token, "accept")
                    if updated:
                        try:
                            items = updated.get("extracted", {}).get("items") or []
                            deduct_inventory_stock(items)
                        except Exception as exc:
                            logger.warning("failed to deduct stock on docuseal completion check: %s", exc)
                        return jsonify(updated), 200
            except Exception as e:  # noqa: BLE001
                logger.warning("[docuseal] Status check exception for deal %s: %s", deal_id, e)

        return jsonify(deal), 200

    @app.post("/api/webhooks/docuseal")
    def docuseal_webhook():
        data = request.json or {}
        event_type = data.get("event_type") or data.get("event")
        if event_type == "submission.completed":
            sub_id = data.get("data", {}).get("id") or data.get("submission_id")
            if sub_id:
                deal = find_deal_by_docuseal_id(sub_id)
                if deal and deal.get("signature_status") != "signed":
                    token = deal.get("signature_token") or "docuseal"
                    updated, _ = sign_deal(deal["id"], token, "accept")
                    if updated:
                        try:
                            items = updated.get("extracted", {}).get("items") or []
                            deduct_inventory_stock(items)
                        except Exception as exc:
                            logger.warning("failed to deduct stock on docuseal webhook accept: %s", exc)
        return jsonify({"received": True}), 200

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
        try:
            items = updated.get("extracted", {}).get("items") or []
            deduct_inventory_stock(items)
        except Exception as exc:
            logger.warning("failed to deduct inventory stock on confirm: %s", exc)
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

        provider = str(payload.get("provider") or "auto").strip().lower()

        updated = request_signature(deal_id, counterparty_email)
        if not updated:
            return jsonify({"error": "failed to generate signature request"}), 500

        token = updated.get("signature_token") or ""
        accept_url = email_service.build_sign_url(deal_id, token, action="accept")
        decline_url = email_service.build_sign_url(deal_id, token, action="decline")

        subject = str(payload.get("subject") or f"E-Signature Request: {updated['deal_name']}")
        body = str(payload.get("body") or f"Please review and sign the agreement for {updated['deal_name']}.\n\nAccept: {accept_url}\nDecline: {decline_url}")

        pdf_bytes = email_service.generate_agreement_pdf(updated)

        if provider == "docuseal":
            counterparty_name = updated.get("counterparty_name") or "Counterparty"
            ds_res = docuseal_service.send_docuseal_signature_request(
                deal_data=updated,
                pdf_path_or_bytes=pdf_bytes,
                recipient_email=counterparty_email,
                recipient_name=counterparty_name,
            )
            if not ds_res.get("success"):
                err_msg = ds_res.get("error") or ds_res.get("message") or "DocuSeal signature dispatch failed."
                logger.warning(f"[deals] DocuSeal signature dispatch failed for deal {deal_id}: {err_msg}")
                return jsonify({
                    "error": err_msg,
                    "email_sent": False,
                    "email_provider": "docuseal",
                    "email_send_note": err_msg
                }), 400

            sub_id = ds_res.get("submission_id")
            ag_data = updated.get("agreement") or {}
            ag_data["docuseal_submission_id"] = sub_id
            ag_data["docuseal_id"] = sub_id
            update_deal(deal_id, {"agreement": ag_data})

            updated["docuseal_id"] = sub_id
            updated["email_provider"] = "docuseal"
            updated["email_sent"] = True
            updated["email_receipt_id"] = str(sub_id) if sub_id else None
            updated["email_send_note"] = ds_res.get("message", "Dispatched via DocuSeal")
            updated["accept_url"] = accept_url
            updated["decline_url"] = decline_url
            return jsonify(updated), 200

        dispatch_res = email_service.dispatch_agreement_signature_package(
            deal_data=updated,
            recipient_email=counterparty_email,
            pdf_bytes=pdf_bytes,
            token=token,
            provider=provider,
            subject=subject,
            body=body,
        )

        if not dispatch_res.get("success"):
            err_msg = dispatch_res.get("error") or dispatch_res.get("message") or "Email dispatch failed."
            logger.warning(f"[deals] E-signature dispatch failed for deal {deal_id}: {err_msg}")
            return jsonify({
                "error": err_msg,
                "email_sent": False,
                "email_provider": dispatch_res.get("provider", provider),
                "email_send_note": err_msg
            }), 400

        updated["email_provider"] = dispatch_res.get("provider", provider)
        updated["email_sent"] = True
        updated["email_receipt_id"] = dispatch_res.get("receipt_id")
        updated["email_send_note"] = dispatch_res.get("message") or dispatch_res.get("reason") or ""
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

        if action == "accept" and updated:
            try:
                items = updated.get("extracted", {}).get("items") or []
                deduct_inventory_stock(items)
            except Exception as exc:
                logger.warning("failed to deduct inventory stock on signature accept: %s", exc)

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
    badge_color = "#10B981" if is_success else "#F43F5E"
    glow_color = "rgba(16, 185, 129, 0.35)" if is_success else "rgba(244, 63, 94, 0.35)"
    icon_symbol = "✓" if is_success else "✕"
    redirect_url = f"http://localhost:5173/deals/{deal_id}" if deal_id else "http://localhost:5173"
    timestamp_str = signed_at or (datetime.utcnow().isoformat() + "Z")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | Armor E-Signature Verification</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-gradient: radial-gradient(circle at 50% 0%, #1E293B 0%, #0F172A 50%, #090D16 100%);
            --card-bg: rgba(30, 41, 59, 0.7);
            --card-border: rgba(255, 255, 255, 0.1);
            --fg: #F8FAFC;
            --muted: #94A3B8;
            --primary: #3B82F6;
            --primary-hover: #2563EB;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: var(--bg-gradient);
            color: var(--fg);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }}
        .wrapper {{
            max-width: 520px;
            width: 100%;
        }}
        .card {{
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            padding: 40px 32px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }}
        .brand-badge {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: rgba(59, 130, 246, 0.12);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #60A5FA;
            text-transform: uppercase;
            margin-bottom: 28px;
        }}
        .brand-badge svg {{
            width: 14px;
            height: 14px;
            fill: currentColor;
        }}
        .icon-circle {{
            width: 76px;
            height: 76px;
            border-radius: 50%;
            background: {glow_color};
            color: {badge_color};
            font-size: 36px;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
            border: 2px solid {badge_color};
            box-shadow: 0 0 30px {glow_color};
            animation: pulseGlow 2.5s infinite ease-in-out;
        }}
        @keyframes pulseGlow {{
            0%, 100% {{ transform: scale(1); box-shadow: 0 0 25px {glow_color}; }}
            50% {{ transform: scale(1.05); box-shadow: 0 0 40px {glow_color}; }}
        }}
        h1 {{
            font-family: 'Outfit', sans-serif;
            font-size: 26px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #FFFFFF;
            letter-spacing: -0.02em;
        }}
        p.subtitle {{
            font-size: 14px;
            color: var(--muted);
            line-height: 1.6;
            margin-bottom: 28px;
        }}
        .details-box {{
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 20px;
            text-align: left;
            margin-bottom: 28px;
            font-size: 13px;
        }}
        .details-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
        }}
        .details-row:last-child {{ border-bottom: none; }}
        .details-row span {{ color: var(--muted); font-weight: 500; }}
        .details-row b {{ color: #F1F5F9; font-family: monospace; font-size: 12px; font-weight: 600; }}
        .btn {{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: #FFFFFF;
            font-weight: 700;
            font-size: 14px;
            padding: 14px;
            border-radius: 12px;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
        }}
        .btn:hover {{
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            transform: translateY(-1px);
            box-shadow: 0 12px 25px rgba(37, 99, 235, 0.45);
        }}
        .redirect-notice {{
            font-size: 11px;
            color: #64748B;
            margin-top: 16px;
            font-weight: 500;
        }}
    </style>
    <script>
      setTimeout(() => {{ window.location.href = "{redirect_url}"; }}, 4000);
    </script>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <div class="brand-badge">
                <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8Mess9z"/></svg>
                ARMOR E-SIGNATURE VERIFIED
            </div>
            <div class="icon-circle">{icon_symbol}</div>
            <h1>{title}</h1>
            <p class="subtitle">{subtitle}</p>
            {(
                "<div class='details-box'>"
                + (f"<div class='details-row'><span>Deal Name</span><b>{deal_name}</b></div>" if deal_name else "")
                + (f"<div class='details-row'><span>Agreement ID</span><b>{deal_id}</b></div>" if deal_id else "")
                + (f"<div class='details-row'><span>Timestamp (UTC)</span><b>{timestamp_str}</b></div>")
                + (f"<div class='details-row'><span>Verification Status</span><b style='color:{badge_color}'>{'✓ CONFIRMED & SIGNED' if is_success else '✕ DECLINED'}</b></div>")
                + "</div>"
            ) if (deal_id or deal_name) else ""}
            <a href="{redirect_url}" class="btn">Open Armor Workspace →</a>
            <p class="redirect-notice">Automatically transferring to dashboard in 4 seconds...</p>
        </div>
    </div>
</body>
</html>"""
    return html

