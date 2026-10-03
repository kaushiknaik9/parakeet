import logging
import os
import re
from .llm_config import llm_config, llm_is_configured

logger = logging.getLogger(__name__)

# Non-Latin Unicode character detection range (Devanagari, Gurmukhi, Gujarati, Tamil, Telugu, etc.)
NON_LATIN_INDIC_REGEX = re.compile(
    r"[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]"
)

INDIC_PHRASE_REGEX = re.compile(
    r"\b(namaste|ji|humein|hume|chahiye|chahiaye|rate|rupaye|rupee|rupees|hoga|kya|haan|bilkul|aaj|kal|saman|paisa|kitna|kaise|dedo|bhejo|per piece)\b",
    re.IGNORECASE,
)

INDIC_NUMERAL_MAP = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
}


def _quick_transliterate_numerals(text: str) -> str:
    """Replaces Devanagari numerals with standard Arabic digits."""
    for dev_digit, arab_digit in INDIC_NUMERAL_MAP.items():
        text = text.replace(dev_digit, arab_digit)
    return text


def normalize_transcript_for_procurement(transcript_text: str) -> str:
    """
    Detects non-Latin Unicode scripts (e.g., Devanagari script) or Indic code-mixed speech (Hinglish).
    Translates and transliterates native terms and numbers into standard business English
    for B2B electronics procurement processing.
    """
    if not transcript_text or not transcript_text.strip():
        return ""

    text = _quick_transliterate_numerals(transcript_text.strip())

    # Detect if LLM normalization is required
    has_non_latin = bool(NON_LATIN_INDIC_REGEX.search(text))
    has_indic_words = bool(INDIC_PHRASE_REGEX.search(text))

    if not (has_non_latin or has_indic_words):
        return text

    if not llm_is_configured():
        logger.info("[normalizer] Non-Latin / Indic speech detected but no LLM key configured — using raw transcript")
        return text

    try:
        llm = llm_config(temp=0.1)
        prompt = (
            "You are an Indic language normalizer for commercial B2B procurement agreements.\n"
            "Translate and transliterate the following text into standard business English.\n"
            "Rules:\n"
            "- Convert native numbers (e.g., 'दस हज़ार', '१०,०००', 'paanch hazaar') into standard Arabic digits (e.g., '10,000', '5,000').\n"
            "- Convert transliterated English words written in native script or Indic phonetic script (e.g., 'लैपटॉप', 'माइक्रोकंट्रोलर', 'रेसिस्टर', 'rupaye', 'per piece') into standard English terms ('laptop', 'microcontroller', 'resistor', 'INR', 'per unit').\n"
            "- Normalize transliterated component names into standard alphanumeric MPNs. Never combine part numbers/model digits with prices or quantities.\n"
            "- When a speaker stumbles on a number (e.g., 'one hundred and ten twenty'), preserve the full phrase verbatim so contract extraction logic can verify it against line totals.\n"
            "- Preserve speaker labels (e.g., 'Speaker A:', 'Speaker B:', 'Buyer:', 'Seller:', 'Speaker 1:') verbatim at the start of lines.\n"
            "- Do not summarize; preserve all commercial facts, prices, MPNs, component names, and quantities verbatim.\n"
            "- Return ONLY the normalized English text, with no extra markdown formatting or conversational intro.\n\n"
            f"Input Transcript:\n{text}"
        )

        response = llm.call([{"role": "user", "content": prompt}])
        result_text = str(response or "").strip()
        result_text = re.sub(r"^```[a-z]*\n|```$", "", result_text).strip()

        if result_text and len(result_text) > 10:
            logger.info("[normalizer] Indic script normalized successfully into English")
            return result_text
    except Exception as exc:
        logger.warning("[normalizer] LLM normalization call failed: %s — falling back to raw text", exc)

    return text
