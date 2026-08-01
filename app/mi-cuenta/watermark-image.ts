"use client";

type WatermarkOptions = {
  maxBytes: number;
  maxDimension: number;
};

type ImageSource = {
  naturalWidth: number;
  naturalHeight: number;
};

const watermarkPositions = [
  { x: 0.36, y: 0.39, angle: -12 },
  { x: 0.64, y: 0.43, angle: 10 },
  { x: 0.43, y: 0.62, angle: 8 },
  { x: 0.61, y: 0.62, angle: -10 },
] as const;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo preparar la marca de agua."));
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
    const qualities = [0.9, 0.84, 0.78];
    let index = 0;
    let fallback: Blob | null = null;
    const encode = () => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        fallback = blob;
        if (blob.size <= maxBytes || index === qualities.length - 1) return resolve(fallback);
        index += 1;
        encode();
      }, "image/jpeg", qualities[index]);
    };
    encode();
  });
}

export async function watermarkImage(file: File, options: WatermarkOptions) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const [source, logo] = await Promise.all([loadImage(sourceUrl), loadImage("/chile3x-logo-primary.jpeg")]);
    const sourceImage: ImageSource = source;
    const scale = Math.min(1, options.maxDimension / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
    const width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
    const height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no pudo preparar la imagen.");

    context.drawImage(source, 0, 0, width, height);

    const position = positionFor(file);
    const logoWidth = Math.min(width * 0.34, Math.max(118, width * 0.28));
    const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
    context.save();
    context.translate(width * position.x, height * position.y);
    context.rotate((position.angle * Math.PI) / 180);
    context.globalAlpha = 0.15;
    // Screen keeps the black canvas of the supplied wordmark invisible while
    // preserving its white/red/blue brand elements over dark or light photos.
    context.globalCompositeOperation = "screen";
    context.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
    context.restore();

    const blob = await blobFromCanvas(canvas, options.maxBytes);
    if (!blob) throw new Error("No se pudo generar la imagen con marca de agua.");
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-chile3x.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
