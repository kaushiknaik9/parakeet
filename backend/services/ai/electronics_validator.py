import re

# High-level category abstractions for supply chain sanity checks
HIGH_VALUE_CATEGORIES = {
    "microcontroller",
    "semiconductor",
    "processor",
    "fpga",
    "soc",
    "finished device",
    "ic",
    "integrated circuit",
    "gpu",
    "cpu",
}

PASSIVE_CATEGORIES = {
    "passive component",
    "resistor",
    "capacitor",
    "inductor",
}


def validate_electronics_deal_sanity(extracted: dict, raw_transcript: str = "") -> list:
    """
    Scans extracted electronics deal terms and transcript for supply chain anomalies,
    unrealistic lead times, and unit price sanity violations based on component category abstractions.
    Returns a list of deduplicated conflict objects.
    """
    conflicts = list(extracted.get("conflicts") or [])
    seen_topics = {c.get("topic", "") for c in conflicts}

    items = extracted.get("items") or []
    supply_terms = extracted.get("supply_terms") or {}
    
    # 1. Lead Time vs Quantity Plausibility
    lead_time_raw = str(supply_terms.get("lead_time") or extracted.get("delivery_terms") or "").lower()
    total_qty = 0
    
    # Try parsing lead time in days
    lead_days = supply_terms.get("lead_time_days")
    if lead_days is None:
        if "tomorrow" in lead_time_raw or "1 day" in lead_time_raw or "24 hour" in lead_time_raw:
            lead_days = 1
        elif "2 day" in lead_time_raw or "48 hour" in lead_time_raw:
            lead_days = 2
        elif "3 day" in lead_time_raw or "72 hour" in lead_time_raw:
            lead_days = 3
        elif "week" in lead_time_raw:
            m = re.search(r"(\d+)\s*week", lead_time_raw)
            lead_days = int(m.group(1)) * 7 if m else 7

    for item in items:
        qty = item.get("quantity") or 0
        part_name = item.get("part_name") or item.get("mpn") or extracted.get("product_or_service") or "electronic components"
        category = (item.get("category") or "").lower()
        unit_price = item.get("unit_price") or 0.0
        
        try:
            qty_num = int(qty)
        except (ValueError, TypeError):
            qty_num = 0
            
        total_qty += qty_num
        
        # Check high quantity vs short lead time
        if qty_num >= 10000 and lead_days is not None and lead_days < 7:
            topic = "Unrealistic Lead Time"
            if topic not in seen_topics:
                conflicts.append({
                    "topic": "Unrealistic Lead Time",
                    "earlier_statement": f"Requested quantity: {qty_num:,} units of {part_name}",
                    "later_statement": f"Requested lead time: {lead_time_raw or f'{lead_days} days'}",
                    "values": [f"{qty_num:,} units", f"{lead_days} days"],
                    "resolved_value": "Supply Chain Warning Flagged",
                    "resolution": f"Unrealistic Lead Time: Procuring {qty_num:,} units of {part_name} within {lead_time_raw or f'{lead_days} days'} is logistically implausible in global supply chains.",
                    "severity": "high"
                })
                seen_topics.add(topic)

        # Check category-based unit price bounds dynamically
        is_high_value = any(cat in category for cat in HIGH_VALUE_CATEGORIES) or any(cat in part_name.lower() for cat in ["processor", "microcontroller", "semiconductor", "fpga", "gpu", "motherboard"])
        is_passive = any(cat in category for cat in PASSIVE_CATEGORIES) or "resistor" in part_name.lower()
        
        if is_high_value and 0 < unit_price < 10:  # Suspiciously low unit price for high-value IC/MCU
            topic = f"Anomalous Pricing ({part_name})"
            if topic not in seen_topics:
                conflicts.append({
                    "topic": "Anomalous Unit Pricing",
                    "earlier_statement": f"Part model: {part_name}",
                    "later_statement": f"Quoted unit price: {extracted.get('currency', '₹')} {unit_price}",
                    "values": [part_name, f"{unit_price}"],
                    "resolved_value": "Pricing Review Required",
                    "resolution": f"Anomalous Pricing: Unit price ({extracted.get('currency', '₹')}{unit_price}) for hardware component {part_name} appears out of reasonable commercial range.",
                    "severity": "high"
                })
                seen_topics.add(topic)
                
        if is_passive and unit_price > 100000:  # Suspiciously high price for a single passive component
            topic = f"Anomalous Pricing ({part_name})"
            if topic not in seen_topics:
                conflicts.append({
                    "topic": "Anomalous Unit Pricing",
                    "earlier_statement": f"Part model: {part_name}",
                    "later_statement": f"Quoted unit price: {unit_price}",
                    "values": [part_name, f"{unit_price}"],
                    "resolved_value": "Pricing Review Required",
                    "resolution": f"Anomalous Pricing: Price appears out of reasonable commercial range for passive component {part_name}.",
                    "severity": "high"
                })
                seen_topics.add(topic)

        # Check negative or zero quantities/prices
        if qty_num < 0 or unit_price < 0:
            topic = f"Invalid Numerical Values for {part_name}"
            if topic not in seen_topics:
                conflicts.append({
                    "topic": "Invalid Numerical Value",
                    "earlier_statement": f"Quantity: {qty_num}, Unit Price: {unit_price}",
                    "later_statement": "Invalid negative input detected",
                    "values": [str(qty_num), str(unit_price)],
                    "resolved_value": "Invalid Input",
                    "resolution": f"Non-positive quantity or price detected for {part_name}.",
                    "severity": "high"
                })
                seen_topics.add(topic)

    # Global quantity vs lead time fallback check
    if total_qty >= 50000 and lead_days is not None and lead_days < 7 and "Unrealistic Lead Time" not in seen_topics:
        conflicts.append({
            "topic": "Unrealistic Lead Time",
            "earlier_statement": f"Total procurement volume: {total_qty:,} units",
            "later_statement": f"Delivery commitment: {lead_time_raw}",
            "values": [f"{total_qty:,} units", lead_time_raw],
            "resolved_value": "Supply Chain Risk",
            "resolution": f"Unrealistic Lead Time: Procuring {total_qty:,} total units within {lead_time_raw} is logistically implausible in global supply chains.",
            "severity": "high"
        })

    # Final Deduplication Pass across all conflict objects by signature (topic, resolution, severity)
    seen_signatures = set()
    unique_conflicts = []
    for c in conflicts:
        sig = (c.get("topic"), c.get("resolution"), c.get("severity"))
        if sig not in seen_signatures:
            seen_signatures.add(sig)
            unique_conflicts.append(c)

    return unique_conflicts


def enforce_mathematical_invariants(extracted: dict) -> dict:
    """
    Enforces Rule 2 mathematical invariants across all extracted BOM line items and grand totals:
    1. item.total_price == item.quantity * item.unit_price (tolerance +-0.01)
    2. If unit_price contradicts confirmed item/grand total, compute unit_price = total_price / quantity.
    3. grand_total == sum(item.total_price for item in items).
    """
    if not extracted:
        return extracted

    items = extracted.get("items") or []
    total_val_numeric = extracted.get("total_value_numeric")

    # If single item and total_value_numeric is set, but item total_price or unit_price is 0
    if len(items) == 1 and total_val_numeric and total_val_numeric > 0:
        it = items[0]
        qty = float(it.get("quantity") or 0)
        if qty > 0:
            if not it.get("total_price") or it.get("total_price") == 0:
                it["total_price"] = float(total_val_numeric)
            if not it.get("unit_price") or abs((qty * float(it.get("unit_price") or 0)) - float(total_val_numeric)) > 0.5:
                it["unit_price"] = round(float(total_val_numeric) / qty, 2)

    calc_sum = 0.0
    for item in items:
        try:
            qty = float(item.get("quantity") or 0)
            u_price = float(item.get("unit_price") or 0)
            t_price = float(item.get("total_price") or 0)
        except (ValueError, TypeError):
            continue

        if qty > 0:
            if t_price > 0 and (u_price <= 0 or abs((qty * u_price) - t_price) > 0.5):
                # Verbal stumble or missing unit price — reconcile unit_price from line total
                u_price = round(t_price / qty, 2)
                item["unit_price"] = u_price
            elif u_price > 0 and t_price <= 0:
                t_price = round(qty * u_price, 2)
                item["total_price"] = t_price
            elif u_price > 0 and t_price > 0:
                t_price = round(qty * u_price, 2)
                item["total_price"] = t_price

        calc_sum += float(item.get("total_price") or 0.0)

    if items and calc_sum > 0:
        extracted["total_value_numeric"] = round(calc_sum, 2)
        curr = extracted.get("currency", "INR")
        sym = "$" if curr == "USD" else ("€" if curr == "EUR" else "₹")
        extracted["total_value"] = f"{sym}{calc_sum:,.0f}"

    return extracted
