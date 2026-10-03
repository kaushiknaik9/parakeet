import os
import re

ELECTRONICS_KEYWORDS = {
    # Component Categories & Parts
    "microcontroller", "mcu", "processor", "cpu", "gpu", "ic", "integrated circuit",
    "semiconductor", "chip", "silicon", "transistor", "diode", "resistor", "capacitor",
    "inductor", "pcb", "pcba", "board", "display", "lcd", "oled", "power supply",
    "sensor", "module", "connector", "relay", "switch", "fpga", "soc", "memory",
    "ram", "flash", "storage", "hardware", "component", "electronics", "part",
    
    # Common MPNs, Models & Brands
    "stm32", "esp32", "rtx", "gtx", "raspberry", "arduino", "nvidia", "amd", "intel",
    "microchip", "infineon", "ti", "texas instruments", "nxp", "qualcomm", "stmicro",
    "murata", "samsung", "broadcom", "analog devices", "adi",
    
    # Procurement Terms
    "lead time", "leadtime", "moq", "minimum order", "units", "pcs", "pieces",
    "batch", "shipment", "delivery", "rma", "warranty", "rohs", "esd", "unit price",
    "bulk", "procurement", "supply", "quotation", "invoice", "po", "purchase order"
}

REJECT_CASUAL_KEYWORDS = {
    "weather", "coffee", "lunch", "dinner", "weekend", "holiday", "movie", "gym",
    "how are you", "good morning", "good evening", "what's up", "whats up",
    "casual chat", "catch up"
}

REJECT_PERSONAL_FINANCE_KEYWORDS = {
    "mutual fund", "mutual funds", "crypto", "bitcoin", "ethereum", "stock market",
    "stocks", "share market", "trading", "salary", "bonus", "personal loan",
    "home loan", "credit card", "sip", "fd", "fixed deposit", "real estate"
}

COMMERCIAL_MARKERS = [
    # Numbers, prices, units, currencies
    r"\d+", r"₹", r"\$", r"€", r"£", r"\b(usd|inr|eur|gbp|rs|rupees?)\b",
    r"\b(units?|pcs?|pieces?|batch|lot|boxes?|cartons?|moq)\b",
    # MPNs, parts & technologies
    r"\b(stm32|esp32|rtx|gtx|raspberry|arduino|nvidia|infineon|nxp|microchip|ti|samsung)\b",
    r"\b(mcu|ic|cpu|gpu|fpga|soc|pcb|pcba|semiconductor|resistor|capacitor|inductor|diode|transistor|sensor|display)\b",
    # Commercial & supply terms
    r"\b(lead\s*time|delivery|shipment|dispatch|staggered|rma|warranty|rohs|ce|fcc|esd|advance|upfront|po|purchase\s*order|invoice|total|price|rate|cost|inspection)\b"
]

COMMERCIAL_REGEX = re.compile("|".join(COMMERCIAL_MARKERS), re.IGNORECASE)


def validate_electronics_deal_intent(transcript: str) -> dict:
    text = str(transcript or "").strip().lower()
    
    if len(text) < 15:
        return {
            "valid_deal": False,
            "reason": "Transcript is too short to represent a commercial agreement."
        }
        
    # Check for personal finance or purely casual banter
    has_finance = any(re.search(r"\b" + re.escape(kw) + r"\b", text) for kw in REJECT_PERSONAL_FINANCE_KEYWORDS)
    has_casual = any(re.search(r"\b" + re.escape(kw) + r"\b", text) for kw in REJECT_CASUAL_KEYWORDS)
    
    # Count electronics procurement signals
    electronics_matches = [kw for kw in ELECTRONICS_KEYWORDS if re.search(r"\b" + re.escape(kw) + r"\b", text)]
    
    # Check for numbers + commercial words (e.g. quantity or price mentioned)
    has_numbers = bool(re.search(r"\d+", text))
    has_commercial_words = any(w in text for w in ["price", "cost", "total", "pay", "order", "buy", "sell", "supply", "deliver", "rate", "usd", "inr", "rs", "₹", "$"])
    
    if (has_finance or has_casual) and len(electronics_matches) == 0:
        return {
            "valid_deal": False,
            "reason": "No commercial electronics agreement detected. Armor only processes B2B hardware and component agreements."
        }
        
    if len(electronics_matches) >= 1 or (has_numbers and has_commercial_words and len(text) > 40):
        return {
            "valid_deal": True,
            "reason": ""
        }
        
    return {
        "valid_deal": False,
        "reason": "No commercial electronics agreement detected. Armor only processes B2B hardware and component agreements."
    }


def condense_transcript(transcript: str) -> str:
    """
    Heuristic noise stripper that filters out small talk, greetings, weather, sports,
    personal finance, and social preamble from transcripts.
    Retains only lines or sentences containing commercial electronics markers.
    Slashes LLM input token consumption by up to 70%.
    """
    if not transcript or not transcript.strip():
        return ""
        
    lines = [l.strip() for l in transcript.splitlines() if l.strip()]
    condensed_lines = []
    
    for line in lines:
        speaker_match = re.match(r"^([A-Za-z0-9 _\-]{1,25}:)\s*(.*)$", line)
        speaker = speaker_match.group(1) if speaker_match else ""
        content = speaker_match.group(2) if speaker_match else line
        
        sentences = re.split(r"(?<=[.!?])\s+", content)
        retained_sentences = []
        
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            s_lower = s_clean.lower()
            if any(w in s_lower for w in ["coffee", "weather", "weekend", "how are you", "good morning", "mutual fund", "sip"]):
                if not any(k in s_lower for k in ["stm32", "esp32", "rtx", "pcb", "moq", "lead time", "rma"]):
                    continue
            
            if COMMERCIAL_REGEX.search(s_clean):
                retained_sentences.append(s_clean)
                
        if retained_sentences:
            retained_text = " ".join(retained_sentences)
            condensed_lines.append(f"{speaker} {retained_text}".strip() if speaker else retained_text)
            
    if not condensed_lines:
        return transcript.strip()
        
    return "\n".join(condensed_lines)
