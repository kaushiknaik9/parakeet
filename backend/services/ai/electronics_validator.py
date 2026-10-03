import re

HIGH_VALUE_PARTS = {"rtx", "gpu", "stm32", "esp32", "raspberry", "processor", "fpga", "soc", "cpu", "microcontroller", "mcu", "module"}

def validate_electronics_deal_sanity(extracted: dict, raw_transcript: str = "") -> list:
    """
    Scans extracted electronics deal terms and transcript for supply chain anomalies,
    unrealistic lead times, and unit price sanity violations. Returns a list of conflict objects.
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
            topic = f"Unrealistic Lead Time for {part_name}"
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

        # Check unit price bounds
        lowered_part = part_name.lower()
        is_premium_system = any(p in lowered_part for p in ["rtx", "gtx", "gpu", "raspberry", "pi", "processor", "cpu", "motherboard", "fpga"])
        is_high_value = any(hv in lowered_part for hv in HIGH_VALUE_PARTS) or "microcontroller" in category or "semiconductor" in category
        
        if (is_premium_system and 0 < unit_price < 500) or (is_high_value and 0 < unit_price < 10):  # e.g. ₹50 for RTX 4090/Raspberry Pi or ₹5 for STM32
            topic = f"Anomalous Pricing ({part_name})"
            if topic not in seen_topics:
                conflicts.append({
                    "topic": "Anomalous Unit Pricing",
                    "earlier_statement": f"Part model: {part_name}",
                    "later_statement": f"Quoted unit price: {extracted.get('currency', '₹')} {unit_price}",
                    "values": [part_name, f"{unit_price}"],
                    "resolved_value": "Pricing Review Required",
                    "resolution": f"Anomalous Pricing: Unit price ({extracted.get('currency', '₹')}{unit_price}) for high-spec component {part_name} appears out of reasonable commercial range.",
                    "severity": "high"
                })
                seen_topics.add(topic)
                
        if unit_price > 1000000 and "resistor" in lowered_part:
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

    return conflicts
