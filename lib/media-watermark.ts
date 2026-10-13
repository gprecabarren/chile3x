/** The same neutral, centered wordmark is burned into photos and video frames. */
export function drawChile3xWatermark(context: CanvasRenderingContext2D, width: number, height: number) {
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
