"use client";
import { useEffect, useRef } from "react";

export function SelectedVideoPreview({ file }: { file: File }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const source = URL.createObjectURL(file);
    video.src = source;
    return () => { video.pause(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(source); };
  }, [file]);
  return <div className="selected-video-preview"><video ref={videoRef} controls playsInline preload="metadata" aria-label="Vista previa del video seleccionado" /><small>Revisa el video completo y su sonido antes de enviarlo.</small></div>;
}
