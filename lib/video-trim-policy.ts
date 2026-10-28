import { MAX_VIDEO_SECONDS } from "./video-policy";

export type VideoTrim = { start: number; end: number };
const epsilon = 0.000001;

export function defaultVideoTrim(duration: number): VideoTrim {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("No se pudo leer la duración del video.");
  return { start: 0, end: Math.min(duration, MAX_VIDEO_SECONDS) };
}

export function validateVideoTrim(duration: number, trim: VideoTrim): VideoTrim {
  defaultVideoTrim(duration);
  if (!Number.isFinite(trim.start) || !Number.isFinite(trim.end) || trim.start < 0 || trim.start >= duration || trim.end > duration + epsilon || trim.end <= trim.start) throw new Error("Elige un inicio y un final válidos dentro del video original.");
  if (trim.end - trim.start > MAX_VIDEO_SECONDS + epsilon) throw new Error(`El fragmento debe durar ${MAX_VIDEO_SECONDS} segundos o menos.`);
  return { start: trim.start, end: Math.min(trim.end, duration) };
}

/** Move the other endpoint only when needed to preserve a valid short clip. */
export function moveVideoTrim(duration: number, trim: VideoTrim, point: keyof VideoTrim, value: number): VideoTrim {
  if (!Number.isFinite(value)) return trim;
  const minimum = Math.min(0.01, duration);
  if (point === "start") {
    const start = Math.max(0, Math.min(value, duration - minimum));
    return { start, end: Math.min(duration, start + MAX_VIDEO_SECONDS, Math.max(trim.end, start + minimum)) };
  }
  const end = Math.max(minimum, Math.min(value, duration));
  return { start: Math.max(0, end - MAX_VIDEO_SECONDS, Math.min(trim.start, end - minimum)), end };
}

export function videoTimeLabel(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(safe / 60)}:${(safe % 60).toFixed(2).padStart(5, "0")}`;
}
