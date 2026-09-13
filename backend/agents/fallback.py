"""
Heuristic, regex-based deal extraction used when no LLM API key is configured
(or the LLM call fails/times out) so the demo still produces a usable result.
Once a real key is added to .env, the CrewAI agents take over automatically.
"""
import re
from datetime import datetime

try:
    from dateutil import parser as date_parser
except Exception:  # pragma: no cover
    date_parser = None

CURRENCY_SYMS = {"₹": "INR", "$": "USD", "€": "EUR", "£": "GBP"}

AMOUNT_RE = re.compile(
    r"(?P<sym>[₹$€£])\s?(?P<num>[\d,]+(?:\.\d+)?)\s?(?P<unit>lakh[s]?|l\b|crore[s]?|cr\b|k\b)?",
    re.IGNORECASE,
)
PERCENT_RE = re.compile(r"(\d{1,3}(?:\.\d+)?)\s?%")
QUANTITY_RE = re.compile(
    r"(\d[\d,]*)\s?(units?|pcs?|pieces?|kg|tons?|boxes?|cartons?|licenses?|seats?)",
    re.IGNORECASE,
)
SPEAKER_RE = re.compile(r"^\s*([A-Za-z][A-Za-z .]{0,24}?)\s*:\s*(.+)$")
DATE_HINT_RE = re.compile(
    r"(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}?"
    r"|\d{4}-\d{2}-\d{2}"
    r"|\d{1,2}/\d{1,2}/\d{2,4})",
    re.IGNORECASE,
)
BUYER_WORDS = {"buyer", "client", "customer", "purchaser"}
SELLER_WORDS = {"seller", "vendor", "supplier", "agency", "agent", "company"}


def _normalize_amount(sym, num_str, unit):
    try:
        num = float(num_str.replace(",", ""))
    except ValueError:
        return None
    unit = (unit or "").lower()
    if unit in ("lakh", "lakhs", "l"):
        num *= 100000
    elif unit in ("crore", "crores", "cr"):
        num *= 10000000
    elif unit == "k":
        num *= 1000
    return num


def _guess_role(name: str):
    lowered = name.lower()
    if any(w in lowered for w in BUYER_WORDS):
        return "Buyer"
    if any(w in lowered for w in SELLER_WORDS):
        return "Seller"
    return "Party"


def _extract_parties(lines):
    seen = []
    for line in lines:
        m = SPEAKER_RE.match(line)
        if m:
            name = m.group(1).strip()
            if name and name not in seen and len(seen) < 6:
                seen.append(name)
    parties = []
    for idx, name in enumerate(seen):
        role = _guess_role(name)
        if role == "Party":
            role = "Party A" if idx == 0 else "Party B" if idx == 1 else f"Party {idx + 1}"
        parties.append({"name": name, "role": role})
    if not parties:
        parties = [{"name": "Party A", "role": "Party A"}, {"name": "Party B", "role": "Party B"}]
    return parties


def _extract_deadline(text):
    m = DATE_HINT_RE.search(text)
    if not m:
        return None
    raw = m.group(0)
    iso = None
    if date_parser:
        try:
            parsed = date_parser.parse(raw, fuzzy=True, default=datetime.now())
            iso = parsed.date().isoformat()
        except Exception:
            iso = None
    return {"label": "Deadline", "date": iso, "raw_text": raw}


def extract_deal_fallback(transcript: str):
    text = str(transcript or "")
    lines = [l for l in text.splitlines() if l.strip()]

    amounts = []
    for m in AMOUNT_RE.finditer(text):
        val = _normalize_amount(m.group("sym"), m.group("num"), m.group("unit"))
        if val:
            amounts.append((val, CURRENCY_SYMS.get(m.group("sym"), "INR")))
    amounts.sort(key=lambda x: x[0], reverse=True)
    total_value_numeric, currency = (amounts[0] if amounts else (None, "INR"))

    percents = [float(p) for p in PERCENT_RE.findall(text)]
    advance_percent = percents[0] if percents else None

    qty_match = QUANTITY_RE.search(text)
    quantity = f"{qty_match.group(1)} {qty_match.group(2)}" if qty_match else "Not specified in transcript"

    parties = _extract_parties(lines)
    deadline = _extract_deadline(text)

    advance_amount = None
    balance_amount = None
    if total_value_numeric and advance_percent is not None:
        advance_amount = round(total_value_numeric * advance_percent / 100, 2)
        balance_amount = round(total_value_numeric - advance_amount, 2)

    payment_terms_sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", text)
        if re.search(r"%|advance|upfront|balance|installment|payment", s, re.IGNORECASE)
    ]
    delivery_sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", text)
        if re.search(r"deliver|delivery|shipment|dispatch|ship\b", s, re.IGNORECASE)
    ]
    condition_sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", text)
        if re.search(r"\bif\b|condition|subject to|provided that|only if", s, re.IGNORECASE)
    ]
    changed_sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", text)
        if re.search(r"instead|actually|change|revised|updated|let's make it|make it", s, re.IGNORECASE)
    ]

    currency_symbol = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}.get(currency, "₹")

    base_extracted = {
        "parties": parties,
        "product_or_service": "Not clearly specified — please review transcript",
        "quantity": quantity,
        "total_value": f"{currency_symbol}{total_value_numeric:,.0f}" if total_value_numeric else "Not specified",
        "total_value_numeric": total_value_numeric,
        "currency": currency,
        "payment_terms": " ".join(payment_terms_sentences[:2]) or "Not explicitly discussed in transcript",
        "advance_percent": advance_percent,
        "advance_amount": advance_amount,
        "balance_amount": balance_amount,
        "delivery_terms": " ".join(delivery_sentences[:2]) or "Not explicitly discussed in transcript",
        "deadlines": [deadline] if deadline else [],
        "responsibilities": [
            {"party": p["role"], "responsibility": "To be confirmed from transcript"} for p in parties
        ],
        "conditions": condition_sentences[:4] or [],
        "negotiated_changes": changed_sentences[:4] or [],
    }
    base_extracted["conflicts"] = detect_conflicts_fallback(text, base_extracted)
    return base_extracted


STOP_ROLES = ("total", "grand total", "overall")


def _sentences_with_speaker(text: str):
    """Yields (speaker_or_None, sentence) pairs, tracking the most recent
    speaker label seen line-by-line so a conflict can cite who said what."""
    current_speaker = None
    out = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        m = SPEAKER_RE.match(line)
        if m:
            current_speaker = m.group(1).strip()
            rest = m.group(2)
        else:
            rest = line
        for sent in re.split(r"(?<=[.!?])\s+", rest):
            sent = sent.strip()
            if sent:
                out.append((current_speaker, sent))
    return out


def detect_conflicts_fallback(transcript: str, extracted: dict = None):
    """
    Deterministic, regex-based contradiction scanner. This is the safety net
    behind 'Deal Conflict Detection' — it looks for the same category of term
    (advance %, advance amount, quantity, unit/total price, deadline) being
    stated more than once with genuinely different values, and flags it as a
    conflict with both statements quoted so the user can resolve it.

    Deliberately conservative: only flags when values actually disagree
    (allowing small rounding-driven tolerance for percent-vs-amount checks),
    so it doesn't cry wolf on every re-statement of the same figure.
    """
    text = str(transcript or "")
    sentences = _sentences_with_speaker(text)
    conflicts = []

    def cite(speaker, sentence):
        return f"{speaker + ': ' if speaker else ''}\"{sentence.strip()}\""

    # ── 1) Advance percentage stated more than once with different values ──
    percent_mentions = []
    for speaker, sent in sentences:
        if re.search(r"advance|upfront|deposit", sent, re.IGNORECASE):
            for pm in PERCENT_RE.finditer(sent):
                percent_mentions.append((speaker, sent, float(pm.group(1))))
    distinct_percents = {round(p[2], 2) for p in percent_mentions}
    if len(distinct_percents) > 1:
        first = percent_mentions[0]
        last = next(p for p in reversed(percent_mentions) if round(p[2], 2) != round(first[2], 2))
        conflicts.append(
            {
                "topic": "Advance payment percentage",
                "earlier_statement": cite(first[0], first[1]),
                "later_statement": cite(last[0], last[1]),
                "values": [f"{first[2]:g}%", f"{last[2]:g}%"],
                "resolved_value": f"{last[2]:g}%",
                "resolution": (
                    f"Multiple advance percentages were mentioned ({first[2]:g}% then {last[2]:g}%). "
                    f"Treating the most recently stated figure ({last[2]:g}%) as final — confirm with the counterparty."
                ),
                "severity": "high",
            }
        )

    # ── 2) Advance amount stated more than once with different absolute values, OR
    #        an advance % and an advance amount are both stated but don't reconcile ──
    amount_mentions = []
    for speaker, sent in sentences:
        if re.search(r"advance|upfront|deposit", sent, re.IGNORECASE):
            for am in AMOUNT_RE.finditer(sent):
                val = _normalize_amount(am.group("sym"), am.group("num"), am.group("unit"))
                if val:
                    amount_mentions.append((speaker, sent, val))
    distinct_amounts = {round(a[2], 2) for a in amount_mentions}
    if len(distinct_amounts) > 1:
        first = amount_mentions[0]
        last = next(a for a in reversed(amount_mentions) if round(a[2], 2) != round(first[2], 2))
        conflicts.append(
            {
                "topic": "Advance payment amount",
                "earlier_statement": cite(first[0], first[1]),
                "later_statement": cite(last[0], last[1]),
                "values": [f"₹{first[2]:,.0f}", f"₹{last[2]:,.0f}"],
                "resolved_value": f"₹{last[2]:,.0f}",
                "resolution": (
                    f"The advance amount changed mid-conversation from ₹{first[2]:,.0f} to ₹{last[2]:,.0f}. "
                    "Treating the later figure as final — confirm with the counterparty."
                ),
                "severity": "high",
            }
        )
    elif percent_mentions and amount_mentions:
        # Cross-check: does the final % roughly match the final absolute amount?
        total_val = (extracted or {}).get("total_value_numeric")
        last_percent = percent_mentions[-1][2]
        last_amount = amount_mentions[-1][2]
        if total_val:
            implied = total_val * last_percent / 100
            if implied > 0 and abs(implied - last_amount) / implied > 0.05:
                conflicts.append(
                    {
                        "topic": "Advance % vs advance amount mismatch",
                        "earlier_statement": cite(*percent_mentions[-1][:2]),
                        "later_statement": cite(*amount_mentions[-1][:2]),
                        "values": [f"{last_percent:g}% (≈₹{implied:,.0f})", f"₹{last_amount:,.0f}"],
                        "resolved_value": f"₹{last_amount:,.0f}",
                        "resolution": (
                            f"{last_percent:g}% of the total would be ≈₹{implied:,.0f}, but ₹{last_amount:,.0f} "
                            "was explicitly stated as the advance. Treating the explicit rupee figure as final — "
                            "flag this gap with the counterparty before confirming."
                        ),
                        "severity": "medium",
                    }
                )

    # ── 3) Quantity stated more than once with different numbers ──
    qty_mentions = []
    for speaker, sent in sentences:
        for qm in QUANTITY_RE.finditer(sent):
            qty_mentions.append((speaker, sent, int(qm.group(1).replace(",", ""))))
    distinct_qty = {q[2] for q in qty_mentions}
    if len(distinct_qty) > 1:
        first = qty_mentions[0]
        last = next(q for q in reversed(qty_mentions) if q[2] != first[2])
        conflicts.append(
            {
                "topic": "Quantity",
                "earlier_statement": cite(first[0], first[1]),
                "later_statement": cite(last[0], last[1]),
                "values": [str(first[2]), str(last[2])],
                "resolved_value": str(last[2]),
                "resolution": (
                    f"Quantity changed from {first[2]} to {last[2]} during the conversation. "
                    "Treating the later figure as final — confirm with the counterparty."
                ),
                "severity": "high",
            }
        )

    # ── 4) Total/deal value stated more than once with materially different amounts ──
    total_mentions = []
    for speaker, sent in sentences:
        if re.search(r"total|deal value|worth|amount", sent, re.IGNORECASE) or not re.search(
            r"advance|upfront|deposit|balance", sent, re.IGNORECASE
        ):
            for am in AMOUNT_RE.finditer(sent):
                val = _normalize_amount(am.group("sym"), am.group("num"), am.group("unit"))
                if val and val > 1000:  # ignore tiny incidental numbers
                    total_mentions.append((speaker, sent, val))
    # Only compare the *largest* amount per sentence group against later ones, to
    # avoid flagging advance/balance splits of the same total as a "conflict".
    big_totals = sorted({round(v, 2) for _, _, v in total_mentions}, reverse=True)
    if len(big_totals) >= 2 and (big_totals[0] - big_totals[1]) / big_totals[0] > 0.15:
        # Only flag if the two biggest distinct figures genuinely diverge by >15%
        # (small deltas are usually advance/balance components, not conflicts).
        first_match = next((m for m in total_mentions if round(m[2], 2) == big_totals[1]), None)
        last_match = next((m for m in reversed(total_mentions) if round(m[2], 2) == big_totals[0]), None)
        if first_match and last_match and first_match[1] != last_match[1]:
            conflicts.append(
                {
                    "topic": "Total deal value",
                    "earlier_statement": cite(first_match[0], first_match[1]),
                    "later_statement": cite(last_match[0], last_match[1]),
                    "values": [f"₹{first_match[2]:,.0f}", f"₹{last_match[2]:,.0f}"],
                    "resolved_value": f"₹{max(big_totals[0], big_totals[1]):,.0f}",
                    "resolution": "Two significantly different total values were mentioned — verify which is final.",
                    "severity": "medium",
                }
            )

    return conflicts


def simulate_change_fallback(extracted: dict, change_text: str):
    """
    Deterministic 'what happens if something changes?' simulator used when no
    LLM is configured. Understands the most common negotiation-change shapes:
      - quantity change ("600 units instead of 500", "make it 600 units")
      - new total value ("actually make it ₹5,00,000")
      - new advance percent ("let's do 40% advance instead")
      - new deadline / date change
    Recomputes total value, advance/balance split, and returns a plain-English
    impact summary plus the proposed updated extracted-data object (the
    frontend lets the user Apply it, which persists via /apply-change).
    """
    text = str(change_text or "")
    updated = dict(extracted or {})
    impacts = []

    old_qty_match = QUANTITY_RE.search(str(extracted.get("quantity") or ""))
    old_qty = int(old_qty_match.group(1).replace(",", "")) if old_qty_match else None
    old_total = extracted.get("total_value_numeric")
    currency = extracted.get("currency", "INR")
    symbol = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}.get(currency, "₹")

    new_qty_match = QUANTITY_RE.search(text)
    percent_match = PERCENT_RE.search(text)
    new_amount_match = AMOUNT_RE.search(text)

    changed_something = False

    if new_qty_match and old_qty and old_total:
        new_qty = int(new_qty_match.group(1).replace(",", ""))
        unit = new_qty_match.group(2)
        if new_qty != old_qty:
            unit_price = old_total / old_qty
            new_total = round(unit_price * new_qty, 2)
            updated["quantity"] = f"{new_qty} {unit}"
            updated["total_value_numeric"] = new_total
            updated["total_value"] = f"{symbol}{new_total:,.0f}"
            impacts.append(
                f"Quantity changes from {old_qty} to {new_qty} {unit}. At the implied unit price of "
                f"{symbol}{unit_price:,.2f}, the total deal value moves from {symbol}{old_total:,.0f} "
                f"to {symbol}{new_total:,.0f}."
            )
            changed_something = True
            old_total = new_total  # cascade into advance/balance recompute below

    elif percent_match:
        new_percent = float(percent_match.group(1))
        old_percent = extracted.get("advance_percent")
        if old_percent is None or abs(new_percent - old_percent) > 0.01:
            updated["advance_percent"] = new_percent
            if old_percent is not None:
                impacts.append(f"Advance percentage changes from {old_percent:g}% to {new_percent:g}%.")
            else:
                impacts.append(f"Advance percentage is set to {new_percent:g}%.")
            changed_something = True

    elif new_amount_match:
        val = _normalize_amount(
            new_amount_match.group("sym"), new_amount_match.group("num"), new_amount_match.group("unit")
        )
        if val and old_total and abs(val - old_total) / max(old_total, 1) > 0.001:
            impacts.append(f"Total deal value changes from {symbol}{old_total:,.0f} to {symbol}{val:,.0f}.")
            updated["total_value_numeric"] = val
            updated["total_value"] = f"{symbol}{val:,.0f}"
            old_total = val
            changed_something = True

    # Recompute advance/balance if we have both a total and a percent
    if old_total and updated.get("advance_percent") is not None:
        adv_pct = updated["advance_percent"]
        new_advance = round(old_total * adv_pct / 100, 2)
        new_balance = round(old_total - new_advance, 2)
        old_advance = extracted.get("advance_amount")
        if old_advance is None or abs(new_advance - old_advance) > 1:
            impacts.append(
                f"Advance payment recalculates to {symbol}{new_advance:,.0f} "
                f"({adv_pct:g}%), balance {symbol}{new_balance:,.0f}."
            )
        updated["advance_amount"] = new_advance
        updated["balance_amount"] = new_balance

    deadline_hint = DATE_HINT_RE.search(text)
    if deadline_hint and re.search(r"deliver|deadline|by |date", text, re.IGNORECASE):
        raw = deadline_hint.group(0)
        iso = None
        if date_parser:
            try:
                iso = date_parser.parse(raw, fuzzy=True, default=datetime.now()).date().isoformat()
            except Exception:
                iso = None
        updated["deadlines"] = [{"label": "Revised deadline", "date": iso, "raw_text": raw}]
        impacts.append(f"Deadline updates to {raw}.")
        changed_something = True

    if not changed_something:
        impacts.append(
            "Couldn't confidently parse a specific numeric or date change from that sentence. "
            "Try phrasing it like 'make it 600 units instead of 500' or '40% advance instead' — "
            "or add an LLM key in backend/.env for more flexible natural-language understanding."
        )

    updated.setdefault("negotiated_changes", list(extracted.get("negotiated_changes", [])))
    if changed_something:
        updated["negotiated_changes"] = updated["negotiated_changes"] + [f"What-if: {text}"]

    return {
        "change_text": text,
        "impacts": impacts,
        "updated_extracted": updated,
        "updated_agreement": None,  # frontend regenerates the agreement text view from updated_extracted
        "mode": "fallback",
    }


def build_agreement_fallback(extracted: dict, transcript: str):
    parties = ", ".join(f"{p['name']} ({p['role']})" for p in extracted.get("parties", []))
    summary = (
        f"Based on the conversation, {parties or 'the parties'} discussed "
        f"{extracted.get('product_or_service', 'a deal')} "
        f"for a total value of {extracted.get('total_value', 'an unspecified amount')}. "
        f"Payment terms: {extracted.get('payment_terms', 'not specified')}. "
        f"Delivery terms: {extracted.get('delivery_terms', 'not specified')}."
    )
    sections = [
        {"heading": "Parties Involved", "content": parties or "Not identified"},
        {"heading": "Product / Service", "content": extracted.get("product_or_service", "Not specified")},
        {"heading": "Quantity", "content": extracted.get("quantity", "Not specified")},
        {"heading": "Commercial Value", "content": extracted.get("total_value", "Not specified")},
        {"heading": "Payment Terms", "content": extracted.get("payment_terms", "Not specified")},
        {"heading": "Delivery Terms", "content": extracted.get("delivery_terms", "Not specified")},
        {
            "heading": "Deadlines",
            "content": ", ".join(
                d.get("raw_text") or d.get("date") or "" for d in extracted.get("deadlines", [])
            )
            or "No explicit deadline captured",
        },
        {
            "heading": "Responsibilities",
            "content": "; ".join(
                f"{r['party']}: {r['responsibility']}" for r in extracted.get("responsibilities", [])
            )
            or "Not specified",
        },
        {
            "heading": "Conditions",
            "content": " ".join(extracted.get("conditions", [])) or "None explicitly stated",
        },
        {
            "heading": "Negotiated Changes",
            "content": " ".join(extracted.get("negotiated_changes", [])) or "None captured",
        },
        {
            "heading": "Conflicts / Contradictions Detected",
            "content": (
                "; ".join(f"{c['topic']}: {c['resolution']}" for c in extracted.get("conflicts", []))
                or "None detected — statements were consistent throughout the conversation."
            ),
        },
    ]
    return {
        "title": f"Deal Agreement — {extracted.get('product_or_service', 'Untitled Deal')}",
        "summary": summary,
        "sections": sections,
        "key_terms": [
            extracted.get("total_value", ""),
            extracted.get("payment_terms", ""),
            extracted.get("delivery_terms", ""),
        ],
    }


def build_email_fallback(extracted: dict, agreement: dict):
    parties = extracted.get("parties", [])
    counterparty = parties[1]["name"] if len(parties) > 1 else "Team"
    subject = f"Deal Confirmation — {extracted.get('product_or_service', 'Our Agreement')}"
    body_lines = [
        f"Hi {counterparty},",
        "",
        "Thank you for the discussion today. Based on today's conversation, here are the agreed terms:",
        "",
        f"- Product/Service: {extracted.get('product_or_service', 'N/A')}",
        f"- Quantity: {extracted.get('quantity', 'N/A')}",
        f"- Total Value: {extracted.get('total_value', 'N/A')}",
        f"- Payment Terms: {extracted.get('payment_terms', 'N/A')}",
        f"- Delivery Terms: {extracted.get('delivery_terms', 'N/A')}",
    ]
    if extracted.get("deadlines"):
        d = extracted["deadlines"][0]
        body_lines.append(f"- Deadline: {d.get('raw_text') or d.get('date') or 'N/A'}")
    body_lines += [
        "",
        "Please reply to this email confirming these terms, or let us know if anything needs to be adjusted.",
        "",
        "Best regards,",
    ]
    return {"subject": subject, "body": "\n".join(body_lines)}
