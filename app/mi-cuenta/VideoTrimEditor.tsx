"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ActionButton } from "@/app/ActionButton";
import { defaultVideoTrim, moveVideoTrim, videoTimeLabel, type VideoTrim } from "@/lib/video-trim-policy";

export function VideoTrimEditor({ file, value, disabled, onChange }: { file: File; value?: VideoTrim; disabled: boolean; onChange: (trim: VideoTrim) => void }) {
  const id = useId(), video = useRef<HTMLVideoElement>(null), callback = useRef(onChange), selection = useRef(value);
  const [duration, setDuration] = useState(0), [error, setError] = useState("");
  const [draft, setDraft] = useState<{ point: keyof VideoTrim; text: string } | null>(null);
  useEffect(() => { callback.current = onChange; selection.current = value; }, [onChange, value]);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    let stopped = false;
    const url = URL.createObjectURL(file);
    player.src = url;
    // Read container metadata even when native WebM duration is Infinity.
    void import("./prepare-video").then(module => module.readVideoDuration(file)).then(length => {
      if (stopped) return;
      setDuration(length); setError("");
      callback.current(defaultVideoTrim(length));
    }).catch(cause => { if (!stopped) setError(cause instanceof Error ? cause.message : "No se pudo leer el video."); });
    return () => { stopped = true; player.pause(); player.removeAttribute("src"); player.load(); URL.revokeObjectURL(url); };
  }, [file]);
  const trim = value ?? (duration ? defaultVideoTrim(duration) : undefined);
  function move(point: keyof VideoTrim, next: number) {
    if (!trim || disabled) return;
    const changed = moveVideoTrim(duration, trim, point, next);
    video.current?.pause();
    if (video.current) video.current.currentTime = point === "start" ? changed.start : Math.max(changed.start, changed.end - 0.1);
    onChange(changed);
  }
  return <div className="video-trim-editor">
    <div className="video-trim-original"><video ref={video} controls playsInline preload="metadata" aria-label="Video original para elegir el recorte" onPlay={() => {
      const player = video.current, range = selection.current;
      if (player && range && (player.currentTime < range.start || player.currentTime >= range.end - 0.01)) player.currentTime = range.start;
    }} onTimeUpdate={() => { const player = video.current, range = selection.current; if (player && range && !player.paused && player.currentTime >= range.end) { player.pause(); player.currentTime = range.end; } }} />
    <small>{duration ? `Original: ${videoTimeLabel(duration)}` : "Leyendo duración del original…"}</small></div>
    <fieldset disabled={disabled || !trim} aria-describedby={`${id}-help`}><legend>Recortar duración del video</legend>
      <p id={`${id}-help`}>Elige el inicio y el final. Se guardará solo este fragmento, de hasta 15 segundos; el sonido y la marca de agua se aplican al resultado.</p>
      {error && <p className="video-trim-error" role="alert">{error}</p>}
      {trim && <><div className="video-trim-points">{(["start", "end"] as const).map(point => <div key={point}>
        <label htmlFor={`${id}-${point}`}>{point === "start" ? "Inicio" : "Final"} <span>(segundos)</span></label>
        <input id={`${id}-${point}`} type="number" min={0} max={duration} step="0.01" value={draft?.point === point ? draft.text : Number(trim[point].toFixed(2))} onChange={event => setDraft({ point, text: event.currentTarget.value })} onBlur={event => { move(point, event.currentTarget.valueAsNumber); setDraft(null); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
        <input type="range" min={0} max={duration} step="0.01" value={trim[point]} aria-label={point === "start" ? "Mover inicio del recorte" : "Mover final del recorte"} aria-valuetext={videoTimeLabel(trim[point])} onChange={event => move(point, event.currentTarget.valueAsNumber)} />
      </div>)}</div>
      <p className="video-trim-duration" role="status">Fragmento: {videoTimeLabel(trim.start)} a {videoTimeLabel(trim.end)} · <strong>{(trim.end - trim.start).toFixed(2)} s</strong></p>
      <div className="video-trim-actions"><ActionButton type="button" className="button button-outline" onClick={() => { const player = video.current; if (player) { setError(""); player.currentTime = trim.start; void player.play().catch(cause => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("Pulsa reproducir en el video para revisar el fragmento."); }); } }}>Reproducir fragmento</ActionButton>
      <ActionButton type="button" className="button button-outline" onClick={() => { video.current?.pause(); onChange(defaultVideoTrim(duration)); }}>Restablecer recorte</ActionButton></div></>}
    </fieldset>
  </div>;
}
