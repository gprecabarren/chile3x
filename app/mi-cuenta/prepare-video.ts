import { assertVideoSource, MAX_PREPARED_VIDEO_BYTES, MAX_VIDEO_SECONDS, VIDEO_CODEC_HELP, videoEncodingBitrate, videoOutputSize } from "@/lib/video-policy";
import { createVideoWatermarkProcessor } from "@/lib/video-watermark";
import { validateVideoTrim, type VideoTrim } from "@/lib/video-trim-policy";

export async function readVideoDuration(file: File) {
  assertVideoSource(file.size);
  const m = await import("mediabunny");
  const input = new m.Input({ formats: [m.MP4, m.QTFF, m.WEBM], source: new m.BlobSource(file) });
  try { const duration = await input.computeDuration(); if (!Number.isFinite(duration) || duration <= 0) throw new Error(); return duration; }
  catch { throw new Error("No se pudo leer la duración. Elige un video MP4, WebM o MOV válido."); }
  finally { input.dispose(); }
}

/** Loaded only by the private uploader. No FFmpeg/WASM, camera permission,
 * external converter, server transcoding or intermediate R2 objects. */
export async function prepareVideo(file: File, options: { watermark?: boolean; trim?: VideoTrim; signal?: AbortSignal; onProgress?: (detail: string) => void } = {}) {
  assertVideoSource(file.size);
  options.signal?.throwIfAborted();
  const m = await import("mediabunny");
  const input = new m.Input({ formats: [m.MP4, m.QTFF, m.WEBM], source: new m.BlobSource(file) });
  let conversion: import("mediabunny").Conversion | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const watermark = options.watermark ? createVideoWatermarkProcessor() : undefined;
  const cancel = () => { if (conversion) void conversion.cancel().catch(() => {}); input.dispose(); };
  options.signal?.addEventListener("abort", cancel, { once: true });
  try {
    options.onProgress?.("Leyendo duración y formato…");
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("El archivo no contiene una pista de video válida.");
    const audio = await input.getPrimaryAudioTrack();
    const [duration, width, height, codec, audioCodec] = await Promise.all([
      input.computeDuration(), track.getDisplayWidth(), track.getDisplayHeight(), track.getCodec(), audio?.getCodec(),
    ]);
    const trim = options.trim ? validateVideoTrim(duration, options.trim) : { start: 0, end: Math.min(duration, MAX_VIDEO_SECONDS) };
    const clipDuration = trim.end - trim.start;
    assertVideoSource(file.size, options.trim ? clipDuration : duration);
    const trimming = trim.start > 0 || trim.end < duration - 0.000001;
    const dimensions = videoOutputSize(width, height);
    const mime = await input.getMimeType();
    const isMp4 = mime.startsWith("video/mp4") && !/\.(mov|m4v)$/i.test(file.name) && file.type !== "video/quicktime";
    const isWebm = mime.startsWith("video/webm");
    const compatible = (isMp4 && codec === "avc" && (!audio || audioCodec === "aac"))
      || (isWebm && (codec === "vp8" || codec === "vp9") && (!audio || audioCodec === "opus" || audioCodec === "vorbis"));
    const resize = dimensions.width < width - 1 || dimensions.height < height - 1;
    // Keep a small compatible original: no unnecessary quality loss or encoding.
    if (!watermark && !trimming && compatible && file.size <= MAX_PREPARED_VIDEO_BYTES && !resize) return { file: new File([file], file.name, { type: isMp4 ? "video/mp4" : "video/webm" }), detail: "Video compatible, sin pérdida adicional de calidad.", duration };

    const remuxOnly = !watermark && !trimming && codec === "avc" && (!audio || audioCodec === "aac") && file.size <= MAX_PREPARED_VIDEO_BYTES && !resize;
    const mp4Possible = remuxOnly || (await m.canEncodeVideo("avc", dimensions) && (!audio || (!trimming && audioCodec === "aac") || await m.canEncodeAudio("aac")));
    const videoCodec = mp4Possible ? "avc" : "vp8";
    const audioOutputCodec = mp4Possible ? "aac" : "opus";
    if (!mp4Possible && (!await m.canEncodeVideo("vp8", dimensions) || (audio && (trimming || audioCodec !== "opus") && !await m.canEncodeAudio("opus")))) throw new Error(VIDEO_CODEC_HELP);
    const output = new m.Output({ format: mp4Possible ? new m.Mp4OutputFormat({ fastStart: "in-memory" }) : new m.WebMOutputFormat(), target: new m.BufferTarget() });
    conversion = await m.Conversion.init({
      input, output, tracks: "primary", trim,
      video: remuxOnly ? { codec: "avc" } : { codec: videoCodec, ...dimensions, fit: "contain", frameRate: 30, quality: new m.Quality({ bitrate: videoEncodingBitrate(dimensions.width, dimensions.height, clipDuration) }), keyFrameInterval: 2, allowTransformationMetadata: false, ...(trimming ? { forceTranscode: true } : {}), ...(watermark ? { forceTranscode: true, process: watermark.process, processedWidth: dimensions.width, processedHeight: dimensions.height } : {}) },
      audio: { codec: audioOutputCodec, ...(trimming ? { forceTranscode: true } : {}), ...(audioCodec === audioOutputCodec && !trimming ? {} : { quality: new m.Quality({ bitrate: 96_000 }) }) },
    });
    // Never silently drop an unreadable audio or video track.
    if (!conversion.isValid || conversion.discardedTracks.some(item => item.reason !== "max_track_count_reached" && item.reason !== "max_track_count_of_type_reached")) throw new Error(VIDEO_CODEC_HELP);
    options.signal?.throwIfAborted();
    timeout = setTimeout(() => { timedOut = true; cancel(); }, 90_000);
    let lastPercent = -1;
    conversion.onProgress = progress => { const percent = Math.floor(progress * 100); if (percent !== lastPercent) { lastPercent = percent; options.onProgress?.(`${watermark ? "Aplicando marca de agua y preparando video" : remuxOnly ? "Preparando formato" : "Optimizando video"}: ${percent}%…`); } };
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength > MAX_PREPARED_VIDEO_BYTES) throw new Error(`No se logró reducir este video a ${MAX_PREPARED_VIDEO_BYTES / 1_000_000} MB. Graba una versión más corta o a 720p e inténtalo nuevamente. No se subió el original.`);
    const prepared = new File([buffer], `${file.name.replace(/\.[^.]+$/, "")}-optimizado.${mp4Possible ? "mp4" : "webm"}`, { type: mp4Possible ? "video/mp4" : "video/webm" });
    const sizeLabel = prepared.size < 1_000_000 ? `${Math.ceil(prepared.size / 1_000)} KB` : `${(prepared.size / 1_000_000).toFixed(1)} MB`;
    return { file: prepared, duration: clipDuration, detail: remuxOnly ? "Convertido a MP4 sin pérdida adicional de calidad." : `Video ${trimming ? "recortado" : "optimizado"}${watermark ? " con marca de agua" : ""} · ${clipDuration.toFixed(2)} s · ${dimensions.width} × ${dimensions.height} · ${sizeLabel}. Revisa la versión final antes de enviarla.` };
  } catch (cause) {
    if (options.signal?.aborted) throw new Error("Proceso cancelado. No se subió el video.");
    if (timedOut) throw new Error("La preparación tardó demasiado. Prueba un video a 720p o un navegador actualizado. No se subió el original.");
    if (cause instanceof Error && (cause.message.includes("MB") || cause.message.includes("segundos") || cause.message.includes("4K") || cause.message === VIDEO_CODEC_HELP || cause.message.includes("pista de video") || cause.message.includes("marca de agua") || cause.message.includes("inicio y un final") || cause.message.includes("duración del video"))) throw cause;
    throw new Error(VIDEO_CODEC_HELP);
  } finally {
    if (timeout) clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
    if (conversion && conversion.state !== "done") await conversion.cancel().catch(() => {});
    watermark?.dispose();
    input.dispose();
  }
}
