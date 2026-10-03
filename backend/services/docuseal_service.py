import base64
import logging
import os
import requests

logger = logging.getLogger(__name__)

DOCUSEAL_API_URL = "https://api.docuseal.com"


def send_docuseal_signature_request(
    deal_data: dict,
    pdf_path_or_bytes,
    recipient_email: str,
    recipient_name: str = None,
) -> dict:
    """Uploads agreement PDF to DocuSeal to create a dynamic template and dispatches signature request email."""
    api_key = os.environ.get("DOCUSEAL_API_KEY")
    if not api_key:
        logger.warning("[docuseal] DOCUSEAL_API_KEY is not set in backend .env")
        return {
            "success": False,
            "provider": "docuseal",
            "error": "DOCUSEAL_API_KEY is not configured in backend .env",
            "message": "DocuSeal API key is missing from backend environment."
        }

    if isinstance(pdf_path_or_bytes, bytes):
        b64_file = base64.b64encode(pdf_path_or_bytes).decode("utf-8")
    else:
        with open(pdf_path_or_bytes, "rb") as f:
            b64_file = base64.b64encode(f.read()).decode("utf-8")

    deal_id = str(deal_data.get("id") or "deal")
    deal_title = deal_data.get("deal_name") or deal_data.get("title") or f"Agreement-{deal_id}"

    headers = {
        "X-Auth-Token": api_key.strip(),
        "Content-Type": "application/json",
    }

    # Step 1: Create PDF Template on DocuSeal (Auto-detects {{Supplier Signature;type=signature;role=Signer;width=180;height=45}} text tag)
    template_payload = {
        "name": deal_title,
        "documents": [{
            "name": f"Armor_Agreement_{deal_id}.pdf",
            "file": f"data:application/pdf;base64,{b64_file}",
        }],
    }

    try:
        tmpl_resp = requests.post(
            f"{DOCUSEAL_API_URL}/templates/pdf",
            json=template_payload,
            headers=headers,
            timeout=15,
        )
        if tmpl_resp.status_code not in [200, 201]:
            err_text = tmpl_resp.text
            logger.error(f"[docuseal] Failed to create template ({tmpl_resp.status_code}): {err_text}")
            return {
                "success": False,
                "provider": "docuseal",
                "error": f"DocuSeal Template Creation HTTP {tmpl_resp.status_code}: {err_text}",
                "message": err_text,
            }

        template_data = tmpl_resp.json()
        template_id = template_data.get("id")

        # Step 2: Dispatch Signature Request Submission Email
        sub_payload = {
            "template_id": template_id,
            "submitters": [{
                "role": "Signer",
                "email": recipient_email,
                "name": recipient_name or "Authorized Signatory",
            }],
        }

        sub_resp = requests.post(
            f"{DOCUSEAL_API_URL}/submissions",
            json=sub_payload,
            headers=headers,
            timeout=15,
        )

        if sub_resp.status_code in [200, 201]:
            res_json = sub_resp.json()
            sub_id = None
            embed_src = None
            if isinstance(res_json, list) and len(res_json) > 0:
                sub_id = res_json[0].get("submission_id") or res_json[0].get("id")
                embed_src = res_json[0].get("embed_src")
            elif isinstance(res_json, dict):
                sub_id = res_json.get("submission_id") or res_json.get("id")
                embed_src = res_json.get("embed_src")

            logger.info(f"[docuseal] Submission dispatched successfully! Submission ID: {sub_id}")
            return {
                "success": True,
                "provider": "docuseal",
                "submission_id": sub_id,
                "docuseal_id": sub_id,
                "template_id": template_id,
                "embed_src": embed_src,
                "raw": res_json,
                "message": f"DocuSeal signature request dispatched to {recipient_email} (ID: {sub_id})",
            }
        else:
            err_text = sub_resp.text
            logger.error(f"[docuseal] Submission dispatch failed ({sub_resp.status_code}): {err_text}")
            return {
                "success": False,
                "provider": "docuseal",
                "error": f"DocuSeal Submission HTTP {sub_resp.status_code}: {err_text}",
                "message": err_text,
            }
    except Exception as e:
        logger.error(f"[docuseal] Exception during dispatch: {e}")
        return {
            "success": False,
            "provider": "docuseal",
            "error": str(e),
            "message": f"Failed to connect to DocuSeal API: {str(e)}",
        }


def send_docuseal_package(deal_data, pdf_bytes, recipient_email, recipient_name):
    """Alias helper for send_docuseal_signature_request."""
    return send_docuseal_signature_request(deal_data, pdf_bytes, recipient_email, recipient_name)


def check_docuseal_submission_status(submission_id: str) -> dict:
    """Checks the status of a submission on DocuSeal API."""
    api_key = os.environ.get("DOCUSEAL_API_KEY")
    if not api_key or not submission_id:
        return {"success": False, "status": "unknown"}

    headers = {"X-Auth-Token": api_key.strip()}
    try:
        url = f"{DOCUSEAL_API_URL}/submissions/{submission_id}"
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            status = data.get("status")
            submitters = data.get("submitters", [])
            is_completed = status == "completed" or any(s.get("status") == "completed" for s in submitters)
            return {
                "success": True,
                "status": "completed" if is_completed else status,
                "is_completed": is_completed,
                "raw": data,
            }
    except Exception as exc:
        logger.warning(f"[docuseal] Failed to check status for submission {submission_id}: {exc}")
    return {"success": False, "status": "error"}
