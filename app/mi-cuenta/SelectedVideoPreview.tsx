"use client";
import { useEffect, useRef } from "react";

export function SelectedVideoPreview({ file }: { file: File }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewSought = useRef(false), playbackStarted = useRef(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const source = URL.createObjectURL(file);
    previewSought.current = false; playbackStarted.current = false;
    video.src = `${source}#t=0.001`;
    return () => { video.pause(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(source); };
  }, [file]);
  return <div className="selected-video-preview"><video ref={videoRef} controls playsInline preload="metadata" aria-label="Vista previa del video seleccionado" onLoadedData={() => {
    const video = videoRef.current;
    if (video && video.paused && Number.isFinite(video.duration) && video.duration > 0) {
      try { video.currentTime = Math.min(1, video.duration / 2); previewSought.current = true; } catch { /* Native playback is still available. */ }
    }
  }} onPlay={() => { const video = videoRef.current; if (video && previewSought.current && !playbackStarted.current) video.currentTime = 0; playbackStarted.current = true; }} /><small>Revisa el video completo y su sonido antes de enviarlo.</small></div>;
}
