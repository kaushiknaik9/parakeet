import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

const pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
};

const formatTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const AudioRecorder = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setMicError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone access isn't available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onRecordingComplete(blob);
      };

      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setMicError(
        err?.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow mic access and try again."
          : `Could not start recording: ${err.message || err}`,
      );
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <motion.button
        type="button"
        disabled={disabled}
        onClick={isRecording ? stop : start}
        whileTap={{ scale: 0.95 }}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isRecording
            ? "bg-red-500/15 border-2 border-red-500 text-red-500"
            : "bg-[var(--text-main)] text-[var(--bg-main)] border-2 border-transparent"
        }`}
      >
        {isRecording && (
          <motion.span
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-red-500/40"
          />
        )}
        {isRecording ? <Square size={26} className="relative z-10" /> : <Mic size={28} className="relative z-10" />}
      </motion.button>

      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--text-main)] tabular-nums">
          {isRecording ? formatTime(seconds) : "Tap to record"}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {isRecording
            ? "Recording — tap again to stop and transcribe"
            : "Record the negotiation call directly from your mic"}
        </p>
      </div>

      {micError && <p className="text-xs text-red-500 text-center max-w-xs">{micError}</p>}
    </div>
  );
};

export default AudioRecorder;
