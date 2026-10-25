import { chileanDay } from "./chile-day.ts";
import { validIsoDay } from "./chile-date-boundary.ts";

/** Calendar bounds are based on Chile's day, including its daylight saving. */
export function travelDateBounds(now = new Date()) {
  const min = chileanDay(now);
  return { min, max: `${Number(min.slice(0, 4)) + 1}-12-31` };
}

export function travelDateShapeError(start: string, end: string) {
  if (!validIsoDay(start) || !validIsoDay(end)) {
    return "Selecciona fechas válidas para el inicio y el término del viaje.";
  }
  if (start > end) return "La fecha de término del viaje debe ser igual o posterior a la de inicio.";
  return null;
}

export function travelDateError(start: string, end: string, now = new Date()) {
  const shapeError = travelDateShapeError(start, end);
  if (shapeError) return shapeError;
  const { min, max } = travelDateBounds(now);
  if (start < min || end < min) {
    return "La agenda de viajes solo permite fechas desde hoy, según la hora de Chile. Si cambió el día mientras completabas el formulario, vuelve a seleccionar las fechas.";
  }
  if (start > max || end > max) {
    return `La agenda de viajes solo permite fechas del año actual y del próximo año, hasta el 31 de diciembre de ${max.slice(0, 4)}.`;
  }
  return null;
}

/** Preserve stored history while only presenting ongoing or upcoming trips. */
export function currentTravelAgenda(metadata: Record<string, string> | null | undefined, now = new Date()) {
  const city = metadata?.travel_city?.trim() ?? "";
  const start = metadata?.travel_start ?? "";
  const end = metadata?.travel_end ?? "";
  if (!city || travelDateShapeError(start, end) || end < chileanDay(now)) return null;
  return { city, start, end, note: metadata?.travel_note ?? "" };
}
