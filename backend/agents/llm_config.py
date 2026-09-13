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


def llm_config(temp=0.2):
    """
    Build a CrewAI LLM instance from environment variables.

    LLM_PROVIDER=openai (default) -> uses OPENAI_API_KEY    + LLM_MODEL (default gpt-4o-mini)
    LLM_PROVIDER=anthropic        -> uses ANTHROPIC_API_KEY + LLM_MODEL (e.g. anthropic/claude-3-5-sonnet-20241022)
    LLM_PROVIDER=gemini           -> uses GEMINI_API_KEY    + LLM_MODEL (default gemini/gemini-2.0-flash)
    LLM_PROVIDER=grok             -> uses XAI_API_KEY       + LLM_MODEL (default xai/grok-2-latest)
    LLM_PROVIDER=ollama           -> uses local Ollama server, LLM_MODEL (default ollama/llama3.1), OLLAMA_BASE_URL
    Any other LLM_MODEL string supported by litellm/CrewAI also works directly.
    """
    provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()
    base_url = ""

    if provider == "ollama":
        model = os.getenv("LLM_MODEL", "ollama/llama3.1")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    elif provider == "anthropic":
        model = os.getenv("LLM_MODEL", "anthropic/claude-3-5-sonnet-20241022")
    elif provider == "gemini":
        model = os.getenv("LLM_MODEL", "gemini/gemini-3.6-flash")
    elif provider in ("grok", "xai"):
        model = os.getenv("LLM_MODEL", "xai/grok-2-latest")
    else:
        model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    temperature = _safe_temp(temp)
    return _build_llm(model=model, base_url=base_url, temperature=temperature)


def llm_is_configured() -> bool:
    """Whether the environment has enough config to actually call a real LLM."""
    provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()
    if provider == "ollama":
        return True  # assumed reachable locally; failures fall back gracefully
    if provider == "anthropic":
        return bool(os.getenv("ANTHROPIC_API_KEY"))
    if provider == "gemini":
        return bool(os.getenv("GEMINI_API_KEY"))
    if provider in ("grok", "xai"):
        return bool(os.getenv("XAI_API_KEY"))
    return bool(os.getenv("OPENAI_API_KEY"))
