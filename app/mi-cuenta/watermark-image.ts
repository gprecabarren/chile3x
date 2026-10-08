"use client";

import { validPrivacyRegions, type FacePrivacyRegion } from "@/lib/face-privacy";
import { imagePreparationSize, imageQualityWarning } from "@/lib/image-quality";

export type GalleryImageTransformOptions = {
  maxBytes: number;
  maxDimension: number;
  applyWatermark: boolean;
  blurFaces: boolean;
  faceRegions?: readonly FacePrivacyRegion[];
  onProgress?: (message: string) => void;
};

export type GalleryImageTransformResult = { file: File; facesBlurred: number; qualityWarning: string };

type ImageSource = { naturalWidth: number; naturalHeight: number };
type FaceBox = { originX: number; originY: number; width: number; height: number };

const mediaPipeVisionUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs";
const mediaPipeWasmUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const mediaPipeFaceModelUrl = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let faceDetectorPromise: Promise<{ detect: (source: CanvasImageSource) => { detections?: Array<{ boundingBox?: FaceBox }> } }> | null = null;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo preparar la imagen."));
    image.src = url;
  });
}

function blobFromCanvas(canvas: HTMLCanvasElement, maxBytes: number) {
  return new Promise<Blob | null>((resolve) => {
    const qualities = [0.94, 0.9, 0.86]; let index = 0; let fallback: Blob | null = null;
    const encode = () => canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      fallback = blob;
      if (blob.size <= maxBytes || index === qualities.length - 1) return resolve(fallback);
      index += 1; encode();
    }, "image/jpeg", qualities[index]);
    encode();
  });
}

async function getFaceDetector() {
  if (!faceDetectorPromise) {
    faceDetectorPromise = (async () => {
      // Loaded only on the device when the owner explicitly requests a face blur.
      // The image itself is processed in this browser and is never sent to the detector.
      const vision = await import(/* @vite-ignore */ mediaPipeVisionUrl) as {
        FilesetResolver: { forVisionTasks: (url: string) => Promise<unknown> };
        FaceDetector: { createFromOptions: (fileset: unknown, options: unknown) => Promise<{ detect: (source: CanvasImageSource) => { detections?: Array<{ boundingBox?: FaceBox }> } }> };
      };
      const fileset = await vision.FilesetResolver.forVisionTasks(mediaPipeWasmUrl);
      return vision.FaceDetector.createFromOptions(fileset, { baseOptions: { modelAssetPath: mediaPipeFaceModelUrl }, runningMode: "IMAGE", minDetectionConfidence: 0.5 });
    })().catch(error => { faceDetectorPromise = null; throw error; });
  }
  return faceDetectorPromise;
}

function blurDetectedFaces(context: CanvasRenderingContext2D, boxes: FaceBox[], scaleX: number, scaleY: number, rounded = true) {
  for (const box of boxes) {
    const width = Math.max(1, box.width * scaleX); const height = Math.max(1, box.height * scaleY);
    const centerX = (box.originX + box.width / 2) * scaleX; const centerY = (box.originY + box.height / 2) * scaleY;
    const padding = Math.max(5, Math.round(Math.max(width, height) * 0.13));
    const left = Math.max(0, Math.floor(centerX - width / 2 - padding));
    const top = Math.max(0, Math.floor(centerY - height / 2 - padding));
    const right = Math.min(context.canvas.width, Math.ceil(centerX + width / 2 + padding));
    const bottom = Math.min(context.canvas.height, Math.ceil(centerY + height / 2 + padding));
    if (right <= left || bottom <= top) continue;
    // Canvas filter is not supported reliably on Safari/iOS. A tiny, smoothed
    // raster permanently removes fine detail in the saved file on every browser.
    const privacy = document.createElement("canvas"); privacy.width = 4; privacy.height = 4;
    const privacyContext = privacy.getContext("2d");
    if (!privacyContext) throw new Error("Tu navegador no pudo aplicar el difuminado. La imagen no se guardó.");
    privacyContext.drawImage(context.canvas, left, top, right - left, bottom - top, 0, 0, 4, 4);
    context.save(); context.beginPath();
    if (rounded) context.ellipse(centerX, centerY, width / 2 + padding, height / 2 + padding, 0, 0, Math.PI * 2);
    else context.rect(left, top, right - left, bottom - top);
    context.clip(); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
    context.drawImage(privacy, left, top, right - left, bottom - top); context.restore();
  }
}

function drawWatermark(context: CanvasRenderingContext2D, width: number, height: number) {
  // A neutral wordmark, always centered. No remote assets, colored logo or rotation.
  const text = "CHILE3X";
  context.save();
  let fontSize = Math.min(width * 0.18, height * 0.2);
  context.font = `800 ${fontSize}px Manrope, Arial, sans-serif`;
  const measured = context.measureText(text).width;
  if (measured > width * 0.76) fontSize *= width * 0.76 / measured;
  context.font = `800 ${fontSize}px Manrope, Arial, sans-serif`;
  context.textAlign = "center"; context.textBaseline = "middle";
  context.lineWidth = Math.max(1, fontSize * 0.025);
  context.strokeStyle = "rgba(0, 0, 0, 0.2)";
  context.fillStyle = "rgba(255, 255, 255, 0.28)";
  context.strokeText(text, width / 2, height / 2);
  context.fillText(text, width / 2, height / 2);
  context.restore();
}

export async function prepareGalleryImage(file: File, options: GalleryImageTransformOptions): Promise<GalleryImageTransformResult> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    options.onProgress?.("Preparando imagen…");
    const source = await loadImage(sourceUrl); const sourceImage: ImageSource = source;
    const { width, height } = imagePreparationSize(sourceImage.naturalWidth, sourceImage.naturalHeight, options.maxDimension);
    const qualityWarning = imageQualityWarning(sourceImage.naturalWidth, sourceImage.naturalHeight);
    // Preserve the bytes of valid, already-sized photos when no effects were requested.
    if (!options.applyWatermark && !options.blurFaces && width === sourceImage.naturalWidth && height === sourceImage.naturalHeight && file.size <= options.maxBytes) {
      return { file, facesBlurred: 0, qualityWarning };
    }
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Tu navegador no pudo preparar la imagen.");
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
    context.fillStyle = "#fff"; context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    let facesBlurred = 0;
    if (options.blurFaces) {
      const manual = options.faceRegions ?? [];
      if (!validPrivacyRegions(manual)) throw new Error("Las zonas de difuminado no son válidas. La imagen no se guardó.");
      if (manual.length) {
        blurDetectedFaces(context, manual.map(region => ({ originX: region.x * width, originY: region.y * height, width: region.width * width, height: region.height * height })), 1, 1, false);
        facesBlurred = manual.length;
      } else {
      options.onProgress?.("Detectando rostros…");
      let boxes: FaceBox[];
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const detector = await Promise.race([getFaceDetector(), new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Detector timeout")), 20_000);
        })]);
        const result = detector.detect(canvas);
        boxes = (result.detections ?? []).flatMap((detection) => detection.boundingBox ? [detection.boundingBox] : []);
      } catch {
        throw new Error("No se pudo cargar el detector. La foto no se subió: marca zonas con el difuminado manual e inténtalo nuevamente.");
      } finally { if (timeout) clearTimeout(timeout); }
      if (!boxes.length) throw new Error("No se detectaron rostros. La foto no se subió: marca las zonas con el difuminado manual y vuelve a intentarlo.");
      blurDetectedFaces(context, boxes, 1, 1);
      facesBlurred = boxes.length;
      }
      options.onProgress?.(`${facesBlurred} zona${facesBlurred === 1 ? "" : "s"} difuminada${facesBlurred === 1 ? "" : "s"}.`);
    }
    if (options.applyWatermark) { options.onProgress?.("Aplicando marca de agua Chile3X…"); drawWatermark(context, width, height); }
    options.onProgress?.("Optimizando imagen…");
    const blob = await blobFromCanvas(canvas, options.maxBytes); if (!blob) throw new Error("No se pudo generar la imagen para subir.");
    if (blob.size > options.maxBytes) throw new Error("La imagen procesada supera el peso permitido. Elige una foto más liviana; no se subió ningún archivo.");
    return { file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-chile3x.jpg`, { type: "image/jpeg" }), facesBlurred, qualityWarning };
  } finally { URL.revokeObjectURL(sourceUrl); }
}
