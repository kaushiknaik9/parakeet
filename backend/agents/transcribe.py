"""
High-accuracy speech-to-text with speaker diarization.

Primary path: AssemblyAI — purpose-built for diarized transcripts, handles
code-switched / multilingual speech well, and needs no heavy local ML deps
(just plain HTTP calls via `requests`).

Fallback path: OpenAI Whisper API — very accurate transcription, but it does
NOT diarize speakers, so the result comes back as a single unlabeled block
(the frontend lets the user manually add "Speaker:" labels before analysis).

No key configured -> raises TranscriptionNotConfigured so the API can return
a clear, actionable error instead of silently producing garbage.
"""
import os
import time

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2"
OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions"

# Long recordings (30-90+ min) can take AssemblyAI several minutes to queue and
# process, especially under shared/free-tier load. The old fixed 180s timeout
# meant any call longer than ~3 minutes to *process* (not even record) would
# fail with "transcription timed out" even though the file itself was well
# under the size/duration limit — this is the "long audio doesn't work" bug.
# We now scale the timeout with the audio file size (bigger file -> more
# generous ceiling) while keeping a sane floor/ceiling, and it's still
# overridable via env for deployments that need more headroom.
DEFAULT_MIN_TIMEOUT = 300  # 5 min floor, plenty for short clips
DEFAULT_MAX_TIMEOUT = 2700  # 45 min ceiling, plenty for hour-long calls
SECONDS_PER_MB = 12  # heuristic: allow ~12s of processing budget per MB of audio


def _session_with_retries() -> requests.Session:
    """A requests session that retries transient network hiccups (connection
    resets, DNS blips, 5xx from AssemblyAI) instead of blowing up the whole
    transcription attempt on one bad poll."""
    session = requests.Session()
    retry = Retry(
        total=4,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=frozenset(["GET", "POST"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _resolve_timeout(file_path: str) -> int:
    env_override = os.getenv("ASSEMBLYAI_TRANSCRIBE_TIMEOUT")
    if env_override:
        try:
            return max(60, int(env_override))
        except ValueError:
            pass
    try:
        size_mb = os.path.getsize(file_path) / (1024 * 1024)
    except OSError:
        size_mb = 0
    scaled = int(size_mb * SECONDS_PER_MB)
    return max(DEFAULT_MIN_TIMEOUT, min(scaled, DEFAULT_MAX_TIMEOUT))


class TranscriptionNotConfigured(Exception):
    pass


class TranscriptionFailed(Exception):
    pass


def stt_provider() -> str:
    return os.getenv("STT_PROVIDER", "assemblyai").strip().lower()


def stt_is_configured() -> bool:
    provider = stt_provider()
    if provider == "assemblyai":
        return bool(os.getenv("ASSEMBLYAI_API_KEY"))
    if provider == "openai":
        return bool(os.getenv("OPENAI_API_KEY"))
    return False


def _speaker_label(raw_label: str) -> str:
    # AssemblyAI returns "A", "B", "C"... -> "Speaker A", "Speaker B"...
    return f"Speaker {raw_label}"


def _transcribe_assemblyai(file_path: str, timeout_seconds: int = None) -> dict:
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        raise TranscriptionNotConfigured("ASSEMBLYAI_API_KEY is not set in backend/.env")

    headers = {"authorization": api_key}
    session = _session_with_retries()
    if timeout_seconds is None:
        timeout_seconds = _resolve_timeout(file_path)

    # 1) Upload audio. Timeout scales with a generous read timeout since large
    # files over a slow connection can legitimately take a couple of minutes
    # to upload — a short fixed timeout here was silently killing big files.
    try:
        with open(file_path, "rb") as f:
            upload_res = session.post(
                f"{ASSEMBLYAI_BASE}/upload",
                headers=headers,
                data=f,
                timeout=(30, 600),  # (connect timeout, read timeout)
            )
    except requests.exceptions.RequestException as e:
        raise TranscriptionFailed(f"AssemblyAI upload failed (network error): {e}")

    if upload_res.status_code != 200:
        raise TranscriptionFailed(f"AssemblyAI upload failed: {upload_res.status_code} {upload_res.text[:300]}")
    audio_url = upload_res.json().get("upload_url")
    if not audio_url:
        raise TranscriptionFailed("AssemblyAI upload did not return an audio URL")

    # 2) Request transcript with diarization + auto language detection
    payload = {
        "audio_url": audio_url,
        "speaker_labels": True,
        "language_detection": True,
        "punctuate": True,
        "format_text": True,
    }
    try:
        create_res = session.post(
            f"{ASSEMBLYAI_BASE}/transcript", headers=headers, json=payload, timeout=(30, 60)
        )
    except requests.exceptions.RequestException as e:
        raise TranscriptionFailed(f"AssemblyAI transcript request failed (network error): {e}")

    if create_res.status_code != 200:
        raise TranscriptionFailed(
            f"AssemblyAI transcript request failed: {create_res.status_code} {create_res.text[:300]}"
        )
    transcript_id = create_res.json()["id"]

    # 3) Poll until complete. Longer/bigger recordings get a proportionally
    # longer budget (see _resolve_timeout) instead of the old fixed 180s cap,
    # and a transient poll failure no longer aborts the whole transcription —
    # it just gets retried on the next tick (the retrying session handles
    # 429/5xx automatically; this loop also tolerates occasional exceptions).
    start = time.time()
    poll_url = f"{ASSEMBLYAI_BASE}/transcript/{transcript_id}"
    consecutive_poll_errors = 0
    while True:
        try:
            poll_res = session.get(poll_url, headers=headers, timeout=(15, 30))
            poll_res.raise_for_status()
            data = poll_res.json()
            consecutive_poll_errors = 0
        except requests.exceptions.RequestException as e:
            consecutive_poll_errors += 1
            if consecutive_poll_errors > 8:
                raise TranscriptionFailed(f"AssemblyAI polling failed repeatedly: {e}")
            time.sleep(3)
            continue

        status = data.get("status")

        if status == "completed":
            break
        if status == "error":
            raise TranscriptionFailed(f"AssemblyAI transcription error: {data.get('error')}")
        if time.time() - start > timeout_seconds:
            raise TranscriptionFailed(
                f"AssemblyAI transcription timed out after {timeout_seconds}s. "
                "For very long recordings, set ASSEMBLYAI_TRANSCRIBE_TIMEOUT in backend/.env to a higher value."
            )
        # Poll a little less aggressively the longer we wait, to be gentle on rate limits.
        time.sleep(3 if time.time() - start < 60 else 5)

    utterances = data.get("utterances") or []
    if utterances:
        lines = [f"{_speaker_label(u['speaker'])}: {u['text'].strip()}" for u in utterances if u.get("text")]
        transcript_text = "\n".join(lines)
    else:
        # No distinct speakers detected — still return the plain transcript
        transcript_text = f"Speaker A: {(data.get('text') or '').strip()}"

    return {
        "transcript": transcript_text,
        "language": data.get("language_code"),
        "confidence": data.get("confidence"),
        "provider": "assemblyai",
        "diarized": bool(utterances),
    }


def _transcribe_openai(file_path: str) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise TranscriptionNotConfigured("OPENAI_API_KEY is not set in backend/.env")

    model = os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1")
    timeout_seconds = _resolve_timeout(file_path)
    try:
        with open(file_path, "rb") as f:
            res = requests.post(
                OPENAI_TRANSCRIBE_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": f},
                data={"model": model},
                timeout=(30, timeout_seconds),
            )
    except requests.exceptions.RequestException as e:
        raise TranscriptionFailed(f"OpenAI transcription failed (network error): {e}")
    if res.status_code != 200:
        raise TranscriptionFailed(f"OpenAI transcription failed: {res.status_code} {res.text[:300]}")

    text = (res.json().get("text") or "").strip()
    return {
        "transcript": f"Speaker A: {text}" if text else "",
        "language": None,
        "confidence": None,
        "provider": "openai",
        "diarized": False,
    }


def transcribe_audio(file_path: str) -> dict:
    """
    Transcribes (and, where supported, diarizes) an audio file on disk.
    Raises TranscriptionNotConfigured / TranscriptionFailed on error — callers
    should surface these as clear user-facing messages, not silently degrade.
    """
    provider = stt_provider()
    if provider == "openai":
        return _transcribe_openai(file_path)
    if provider == "assemblyai":
        return _transcribe_assemblyai(file_path)
    raise TranscriptionNotConfigured(
        f"Unknown STT_PROVIDER '{provider}' — set it to 'assemblyai' or 'openai' in backend/.env"
    )
