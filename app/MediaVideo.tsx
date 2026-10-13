"use client";

import { useEffect, useRef, useState } from "react";

/** Decode one paused frame on screen; no autoplay or extra stored thumbnails. */
export function MediaVideo({ src, contentType, label = "Video" }: { src: string; contentType?: string; label?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewSought = useRef(false), playbackStarted = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    previewSought.current = false; playbackStarted.current = false;
    const load = () => { video.preload = "metadata"; video.load(); };
    if (!window.IntersectionObserver) { load(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: "160px" });
    observer.observe(video);
    return () => { observer.disconnect(); video.pause(); };
  }, [src]);
  function previewFrame() {
    const video = videoRef.current;
    if (!video || previewSought.current || playbackStarted.current || !video.paused || !Number.isFinite(video.duration) || video.duration <= 0) return;
    previewSought.current = true;
    // Decode the initial frame, keeping native controls at 00:00. The tiny
    // non-zero time also avoids Safari's empty preview at exactly zero.
    try { video.currentTime = Math.min(0.001, video.duration / 2); } catch { /* Native controls remain available if the stream cannot seek. */ }
  }
  // Seek after the initial decoded frame: a source time fragment can otherwise
  // overwrite a seek performed during loadedmetadata (observed in Chrome).
  return <><video ref={videoRef} controls playsInline preload="none" aria-label={label} onLoadedData={previewFrame} onPlay={() => {
    const video = videoRef.current;
    if (!playbackStarted.current && video && previewSought.current) video.currentTime = 0;
    playbackStarted.current = true;
  }} onError={() => setError("No se pudo cargar la vista previa del video. Revisa la conexión y vuelve a abrir la página; el archivo no se ha modificado.")}>
    <source src={`${src.split("#")[0]}#t=0.001`} type={contentType} />
  </video>{error && <p className="media-video-error" role="status">{error}</p>}</>;
}
