import { BufferSource, Input, MP4, WEBM } from "mediabunny";
import { MAX_PREPARED_VIDEO_BYTES, MAX_VIDEO_SECONDS, VIDEO_DURATION_TOLERANCE } from "./video-policy";

/** Metadata only, on a bounded <=8 MB file. No decoding/transcoding in Workers.
 * Inspect real tracks/duration instead of trusting MIME, extension or client. */
export async function validatePreparedVideo(data: ArrayBuffer, contentType: "video/mp4" | "video/webm") {
  if (!data.byteLength || data.byteLength > MAX_PREPARED_VIDEO_BYTES) throw new Error("Cada video preparado debe pesar 8 MB o menos.");
  const input = new Input({ formats: [contentType === "video/mp4" ? MP4 : WEBM], source: new BufferSource(data) });
  try {
    const tracks = await input.getTracks();
    const videos = await input.getVideoTracks();
    const audio = await input.getAudioTracks();
    if (videos.length !== 1 || audio.length > 1 || tracks.length > 2) throw new Error("El video debe contener una sola imagen en movimiento y como máximo una pista de audio.");
    const [codec, duration] = await Promise.all([videos[0].getCodec(), input.computeDuration()]);
    if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS + VIDEO_DURATION_TOLERANCE) throw new Error("Los videos deben durar 10 segundos o menos.");
    const audioCodec = audio[0] ? await audio[0].getCodec() : null;
    if (contentType === "video/mp4" ? codec !== "avc" || (audio.length && audioCodec !== "aac") : (codec !== "vp8" && codec !== "vp9") || (audio.length && audioCodec !== "opus" && audioCodec !== "vorbis")) throw new Error("El video necesita preparación para ser compatible: usa Preparar video antes de enviarlo. Se guarda MP4/H.264 o WebM compatible.");
    return { duration, codec };
  } catch (cause) {
    if (cause instanceof Error && /^(Los videos|El video)/.test(cause.message)) throw cause;
    throw new Error("No se pudo validar este video. Vuelve a prepararlo desde el formulario; aún no se ha guardado.");
  } finally { input.dispose(); }
}
