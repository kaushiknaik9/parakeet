ALLOWED_AUDIO_EXT = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4", ".mpeg", ".mpga"}
# 50MB was cutting off longer negotiation calls (a ~60-90 min opus recording
# can exceed that). Raised to 200MB — still well under our Flask-level
# MAX_CONTENT_LENGTH ceiling above, and AssemblyAI/Whisper both handle files
# this size comfortably.
MAX_AUDIO_BYTES = 200 * 1024 * 1024  # 200 MB
