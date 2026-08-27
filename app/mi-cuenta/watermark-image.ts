"use client";

export type GalleryImageTransformOptions = {
  maxBytes: number;
  maxDimension: number;
  applyWatermark: boolean;
  blurFaces: boolean;
  onProgress?: (message: string) => void;
};

export type GalleryImageTransformResult = { file: File; facesBlurred: number };

type ImageSource = { naturalWidth: number; naturalHeight: number };
type FaceBox = { originX: number; originY: number; width: number; height: number };

const watermarkPositions = [
  { x: 0.36, y: 0.39, angle: -12 }, { x: 0.64, y: 0.43, angle: 10 },
  { x: 0.43, y: 0.62, angle: 8 }, { x: 0.61, y: 0.62, angle: -10 },
] as const;
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

function positionFor(file: File) {
  let hash = 0;
  for (const character of `${file.name}:${file.size}:${file.lastModified}`) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return watermarkPositions[hash % watermarkPositions.length];
}

function blobFromCanvas(canvas: HTMLCanvasElement, maxBytes: number) {
  return new Promise<Blob | null>((resolve) => {
    const qualities = [0.9, 0.84, 0.78]; let index = 0; let fallback: Blob | null = null;
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
    })();
  }
  return faceDetectorPromise;
}

function blurDetectedFaces(context: CanvasRenderingContext2D, source: CanvasImageSource, boxes: FaceBox[], scaleX: number, scaleY: number) {
  for (const box of boxes) {
    const width = Math.max(1, box.width * scaleX); const height = Math.max(1, box.height * scaleY);
    const centerX = (box.originX + box.width / 2) * scaleX; const centerY = (box.originY + box.height / 2) * scaleY;
    const padding = Math.max(5, Math.round(Math.max(width, height) * 0.13));
    context.save(); context.beginPath();
    context.ellipse(centerX, centerY, width / 2 + padding, height / 2 + padding, 0, 0, Math.PI * 2);
    context.clip(); context.filter = `blur(${Math.max(13, Math.round(Math.max(width, height) * 0.16))}px)`;
    context.drawImage(source, 0, 0, context.canvas.width, context.canvas.height); context.restore();
  }
}

async function drawWatermark(context: CanvasRenderingContext2D, file: File, width: number, height: number) {
  const logo = await loadImage("/chile3x-logo-primary.jpeg"); const position = positionFor(file);
  const logoWidth = Math.min(width * 0.3, Math.max(112, width * 0.24)); const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
  context.save(); context.translate(width * position.x, height * position.y); context.rotate((position.angle * Math.PI) / 180);
  context.globalAlpha = 0.1; context.fillStyle = "#05060a"; context.beginPath();
  context.roundRect(-logoWidth / 2 - 5, -logoHeight / 2 - 4, logoWidth + 10, logoHeight + 8, Math.max(8, logoHeight * 0.18)); context.fill();
  // Screen keeps the dark background of the rounded official logo subtle over every photo.
  context.globalAlpha = 0.16; context.globalCompositeOperation = "screen";
  context.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight); context.restore();
}

export async function prepareGalleryImage(file: File, options: GalleryImageTransformOptions): Promise<GalleryImageTransformResult> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    options.onProgress?.("Preparando imagen…");
    const source = await loadImage(sourceUrl); const sourceImage: ImageSource = source;
    const scale = Math.min(1, options.maxDimension / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
    const width = Math.max(1, Math.round(sourceImage.naturalWidth * scale)); const height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Tu navegador no pudo preparar la imagen.");
    context.drawImage(source, 0, 0, width, height);
    let facesBlurred = 0;
    if (options.blurFaces) {
      options.onProgress?.("Detectando rostros…");
      try {
        const result = (await getFaceDetector()).detect(source);
        const boxes = (result.detections ?? []).flatMap((detection) => detection.boundingBox ? [detection.boundingBox] : []);
        if (boxes.length) {
          blurDetectedFaces(context, source, boxes, width / sourceImage.naturalWidth, height / sourceImage.naturalHeight);
          facesBlurred = boxes.length; options.onProgress?.(`${facesBlurred} rostro${facesBlurred === 1 ? "" : "s"} difuminado${facesBlurred === 1 ? "" : "s"}.`);
        } else options.onProgress?.("No se detectaron rostros.");
      } catch {
        throw new Error("No se pudo detectar rostros en este navegador. Desactiva el difuminado o intenta con otra imagen.");
      }
    }
    if (options.applyWatermark) { options.onProgress?.("Aplicando marca de agua Chile3X…"); await drawWatermark(context, file, width, height); }
    options.onProgress?.("Optimizando imagen…");
    const blob = await blobFromCanvas(canvas, options.maxBytes); if (!blob) throw new Error("No se pudo generar la imagen para subir.");
    return { file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-chile3x.jpg`, { type: "image/jpeg" }), facesBlurred };
  } finally { URL.revokeObjectURL(sourceUrl); }
}
