import type { VideoSample } from "mediabunny";
import { drawChile3xWatermark } from "./media-watermark";

/** A single reusable canvas, processed locally after rotation/resizing.
 * No original uploads, remote assets, temporary objects or CSS-only overlay. */
export function createVideoWatermarkProcessor() {
  let canvas: HTMLCanvasElement | undefined;
  let context: CanvasRenderingContext2D | null = null;
  return {
    process(sample: VideoSample) {
      if (!canvas) { canvas = document.createElement("canvas"); context = canvas.getContext("2d"); }
      if (!context) throw new Error("Tu navegador no pudo aplicar la marca de agua al video. No se subió ningún archivo. Prueba otro navegador actualizado.");
      if (canvas.width !== sample.displayWidth || canvas.height !== sample.displayHeight) {
        canvas.width = sample.displayWidth; canvas.height = sample.displayHeight;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      sample.draw(context, 0, 0);
      drawChile3xWatermark(context, canvas.width, canvas.height);
      return canvas;
    },
    dispose() { if (canvas) { canvas.width = 0; canvas.height = 0; } canvas = undefined; context = null; },
  };
}
