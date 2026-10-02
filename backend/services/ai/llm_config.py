import os
from functools import lru_cache

from crewai import LLM


def _safe_temp(value) -> float:
    try:
        parsed = float(value)
    except Exception:
        parsed = 0.2
    return max(0.0, min(parsed, 1.0))


@lru_cache(maxsize=8)
def _build_llm(model: str, base_url: str, temperature: float):
    kwargs = {"model": model, "temperature": temperature}
    if base_url:
        kwargs["base_url"] = base_url
    return LLM(**kwargs)


def _model_and_base_url(provider: str):
    """
    Resolve (model, base_url) for a given provider string.

    LLM_MODEL only ever applies to whichever provider is LLM_PROVIDER (the
    primary one) — it must NOT leak into a different provider being used as
    the fallback. Use LLM_MODEL_<PROVIDER> to override a specific provider's
    model explicitly (e.g. LLM_MODEL_GROK=xai/grok-2-latest).
    """
    provider = (provider or "").strip().lower()
    is_primary = provider == primary_provider()
    base_url = ""

    def _pick(env_name: str, default: str) -> str:
        specific = os.getenv(env_name)
        if specific:
            return specific
        if is_primary:
            return os.getenv("LLM_MODEL", default)
        return default

    if provider == "ollama":
        model = _pick("LLM_MODEL_OLLAMA", "ollama/llama3.1")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    elif provider == "anthropic":
        model = _pick("LLM_MODEL_ANTHROPIC", "anthropic/claude-3-5-sonnet-20241022")
    elif provider == "gemini":
        model = _pick("LLM_MODEL_GEMINI", "gemini/gemini-3.6-flash")
    elif provider in ("grok", "xai"):
        model = _pick("LLM_MODEL_GROK", "xai/grok-2-latest")
    elif provider == "groq":
        model = _pick("LLM_MODEL_GROQ", "groq/openai/gpt-oss-120b")
    else:
        model = _pick("LLM_MODEL_OPENAI", "gpt-4o-mini")

    return model, base_url


def _grok_api_key() -> str:
    # xAI's Grok. NOT the same company/key as Groq below.
    key = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY", "")
    if key and not os.getenv("XAI_API_KEY"):
        os.environ["XAI_API_KEY"] = key
    return key


def _groq_api_key() -> str:
    # Groq (the fast-inference LPU company) — keys look like "gsk_...".
    # litellm expects this under GROQ_API_KEY.
    return os.getenv("GROQ_API_KEY", "")


def _provider_configured(provider: str) -> bool:
    provider = (provider or "").strip().lower()
    if provider == "ollama":
        return True  # assumed reachable locally; failures fall back gracefully
    if provider == "anthropic":
        return bool(os.getenv("ANTHROPIC_API_KEY"))
    if provider == "gemini":
        return bool(os.getenv("GEMINI_API_KEY"))
    if provider in ("grok", "xai"):
        return bool(_grok_api_key())
    if provider == "groq":
        return bool(_groq_api_key())
    return bool(os.getenv("OPENAI_API_KEY"))


def primary_provider() -> str:
    return os.getenv("LLM_PROVIDER", "openai").strip().lower()


def fallback_provider() -> str:
    """
    LLM_FALLBACK_PROVIDER (e.g. 'grok') is used automatically whenever the
    primary provider's call fails or times out. Empty/unset = no fallback.
    """
    return os.getenv("LLM_FALLBACK_PROVIDER", "").strip().lower()


def llm_config(temp=0.2, provider: str = None):
    """
    Build a CrewAI LLM instance from environment variables.

    LLM_PROVIDER=openai (default) -> uses OPENAI_API_KEY    + LLM_MODEL (default gpt-4o-mini)
    LLM_PROVIDER=anthropic        -> uses ANTHROPIC_API_KEY + LLM_MODEL (e.g. anthropic/claude-3-5-sonnet-20241022)
    LLM_PROVIDER=gemini           -> uses GEMINI_API_KEY    + LLM_MODEL (default gemini/gemini-3.6-flash)
    LLM_PROVIDER=grok             -> uses XAI_API_KEY       + LLM_MODEL (default xai/grok-2-latest)
    LLM_PROVIDER=groq             -> uses GROQ_API_KEY      + LLM_MODEL (default groq/openai/gpt-oss-120b)
    LLM_PROVIDER=ollama           -> uses local Ollama server, LLM_MODEL (default ollama/llama3.1), OLLAMA_BASE_URL
    Any other LLM_MODEL string supported by litellm/CrewAI also works directly.

    LLM_FALLBACK_PROVIDER (optional, e.g. 'groq') is used automatically by the
    crew layer (see crew.py) whenever a call on the primary provider fails or
    times out — no manual switching required.
    """
    provider = provider or primary_provider()
    model, base_url = _model_and_base_url(provider)
    temperature = _safe_temp(temp)
    return _build_llm(model=model, base_url=base_url, temperature=temperature)


def llm_config_fallback(temp=0.2):
    """
    Build the fallback LLM (from LLM_FALLBACK_PROVIDER), or None if no
    fallback provider is set / it isn't configured with an API key.
    """
    fb = fallback_provider()
    if not fb or not _provider_configured(fb):
        return None
    return llm_config(temp=temp, provider=fb)


def llm_is_configured() -> bool:
    """Whether the environment has enough config to actually call a real LLM
    (primary OR fallback provider)."""
    if _provider_configured(primary_provider()):
        return True
    fb = fallback_provider()
    return bool(fb and _provider_configured(fb))
