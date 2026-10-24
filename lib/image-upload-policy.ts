export const MAX_IMAGE_SOURCE_BYTES = 20_000_000;
export const MAX_IMAGE_UPLOAD_BYTES = 10_000_000;
export const IMAGE_INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.jfif,.png,.webp,.heic,.heif";
export const IMAGE_UPLOAD_RULES = "Fotos JPG/JPEG, PNG o WebP: originales de hasta 20 MB. Se optimizan en tu dispositivo a un máximo final de 10 MB antes de subir. HEIC/HEIF se convierte si tu navegador puede abrirlo.";

export function isImageSource(file: { type: string; name: string }) {
  return /^(image\/(jpeg|jpg|pjpeg|png|x-png|webp|heic|heif))$/i.test(file.type) || /\.(jpe?g|jfif|png|webp|heic|heif)$/i.test(file.name);
}

export function assertImageSource(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) throw new Error("La foto está vacía. Descarga el original desde Fotos o iCloud y vuelve a seleccionarlo.");
  if (bytes > MAX_IMAGE_SOURCE_BYTES) throw new Error("El original supera 20 MB. Exporta una copia más pequeña; la foto no se ha subido.");
}

export function imageHeaderType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp";
  return null;
}
