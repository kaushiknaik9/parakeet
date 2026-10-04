import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download } from "lucide-react";

interface AudioPlayerProps {
  audioBlob: Blob | null;
  audioUrl?: string | null;
  durationSeconds?: number;
  filename?: string;
  className?: string;
}

function formatDuration(sec: number): string {
  if (!isFinite(sec) || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AudioPlayer({
  audioBlob,
  audioUrl: externalUrl,
  durationSeconds = 0,
  filename = "meeting-recording.webm",
  className = "",
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [internalUrl, setInternalUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Manage object URL for the audio Blob
  useEffect(() => {
    if (externalUrl) {
      setInternalUrl(externalUrl);
      return;
    }
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setInternalUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioBlob, externalUrl]);

  useEffect(() => {
    if (durationSeconds > 0 && duration === 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => console.warn("Playback error:", err));
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || duration <= 0) return;

    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = () => {
    if (!internalUrl) return;
    const a = document.createElement("a");
    a.href = internalUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const fileSizeKB = audioBlob ? Math.round(audioBlob.size / 1024) : 0;

  return (
    <div
      className={`armor-custom-audio-player ${className}`}
      style={{
        width: "100%",
        maxWidth: 680,
        margin: "0 auto",
        background: "rgba(10, 14, 20, 0.85)",
        border: "1px solid rgba(140, 201, 210, 0.25)",
        borderRadius: 14,
        padding: "18px 24px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {internalUrl && (
        <audio
          ref={audioRef}
          src={internalUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}

      {/* Top Header Row with Status & Metadata */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isPlaying ? "#38BDF8" : "#8CC9D2",
              boxShadow: isPlaying ? "0 0 10px #38BDF8" : "none",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--foreground)",
            }}
          >
            {isPlaying ? "PLAYING RECORDING" : "AUDIO READY FOR REVIEW"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {fileSizeKB > 0 && (
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "#8CC9D2",
                background: "rgba(56, 189, 248, 0.1)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {fileSizeKB} KB
            </span>
          )}
          <button
            onClick={handleDownload}
            title="Download audio recording"
            style={{
              background: "none",
              border: 0,
              color: "var(--muted-foreground)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              borderRadius: 4,
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            <Download size={13} />
            Save .webm
          </button>
        </div>
      </div>

      {/* Main Playback Bar (Interactive Scrubber) */}
      <div
        ref={progressBarRef}
        onClick={handleSeek}
        style={{
          width: "100%",
          height: 12,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {/* Background Track */}
        <div
          style={{
            width: "100%",
            height: 6,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 3,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Active Progress Fill */}
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "linear-gradient(90deg, #38BDF8, #8CC9D2)",
              borderRadius: 3,
              transition: "width 0.08s linear",
            }}
          />
        </div>

        {/* Scrubber Handle */}
        <div
          style={{
            position: "absolute",
            left: `calc(${progressPercent}% - 6px)`,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 0 10px rgba(56, 189, 248, 0.8)",
            pointerEvents: "none",
            transition: "left 0.08s linear",
          }}
        />
      </div>

      {/* Controls & Time Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#38BDF8",
              color: "#040608",
              border: 0,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.06)";
              e.currentTarget.style.background = "#7DD3FC";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#38BDF8";
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: 2 }} />}
          </button>

          {/* Restart Button */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            title="Restart from beginning"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.05)",
              color: "#94A3B8",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            <RotateCcw size={14} />
          </button>

          {/* Monospace Digital Timestamp */}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "0.04em",
            }}
          >
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        {/* Volume Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={toggleMute}
            style={{
              background: "none",
              border: 0,
              color: isMuted ? "#EF4444" : "#94A3B8",
              cursor: "pointer",
              padding: 6,
              display: "grid",
              placeItems: "center",
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
