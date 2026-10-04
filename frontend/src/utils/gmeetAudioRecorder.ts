/**
 * Google Meet Dual-Stream Audio Recorder
 * Combines Microphone audio and Browser Tab / System audio (from Google Meet)
 * using the Web Audio API into a unified audio/webm;codecs=opus stream.
 */

export interface DualAudioRecorder {
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  pause: () => void;
  resume: () => void;
  getState: () => "inactive" | "recording" | "paused";
}

export async function createGMeetAudioRecorder(
  onDataAvailable?: (blob: Blob) => void
): Promise<DualAudioRecorder> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const destination = audioContext.createMediaStreamDestination();

  // 1. User Microphone Stream
  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  const micSource = audioContext.createMediaStreamSource(micStream);
  micSource.connect(destination);

  // 2. Google Meet / Tab Display Media Stream (Audio & Video)
  let displayStream: MediaStream | null = null;
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      } as any,
    });

    const displayAudioTracks = displayStream.getAudioTracks();
    if (displayAudioTracks.length > 0) {
      const displayAudioStream = new MediaStream(displayAudioTracks);
      const displaySource = audioContext.createMediaStreamSource(displayAudioStream);
      displaySource.connect(destination);
    }
  } catch (err) {
    console.warn("Display media / Tab audio capturing skipped or cancelled by user:", err);
  }

  // 3. Instantiate MediaRecorder with Opus codec in WebM container
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const recorder = new MediaRecorder(destination.stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
      if (onDataAvailable) onDataAvailable(e.data);
    }
  };

  return {
    start: async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      chunks.length = 0;
      recorder.start(1000);
    },
    stop: async (): Promise<Blob> => {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          // Stop all track streams
          micStream.getTracks().forEach((t) => t.stop());
          if (displayStream) displayStream.getTracks().forEach((t) => t.stop());
          audioContext.close();

          const combinedBlob = new Blob(chunks, { type: mimeType });
          resolve(combinedBlob);
        };
        recorder.stop();
      });
    },
    pause: () => {
      if (recorder.state === "recording") recorder.pause();
    },
    resume: () => {
      if (recorder.state === "paused") recorder.resume();
    },
    getState: () => recorder.state,
  };
}
