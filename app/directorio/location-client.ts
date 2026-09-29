import { cityGeoDirectory } from "@/app/locations";

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function distanceInKilometers(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const latitudeDelta = toRadians(targetLatitude - latitude);
  const longitudeDelta = toRadians(targetLongitude - longitude);
  const startLatitude = toRadians(latitude);
  const endLatitude = toRadians(targetLatitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function savePreferredCity(citySlug: string) {
  document.cookie = `chile3x_preferred_city=${encodeURIComponent(citySlug)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}

export function nearestCoveredCity(latitude: number, longitude: number) {
  let nearest = cityGeoDirectory[0] ?? null;
  let nearestDistance = nearest
    ? distanceInKilometers(latitude, longitude, nearest.latitude, nearest.longitude)
    : Number.POSITIVE_INFINITY;

  for (const city of cityGeoDirectory.slice(1)) {
    const distance = distanceInKilometers(latitude, longitude, city.latitude, city.longitude);
    if (distance < nearestDistance) {
      nearest = city;
      nearestDistance = distance;
    }
  }

  return nearest ? { ...nearest, distanceInKilometers: nearestDistance } : null;
}

export function locationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "insecure_context") return "La ubicación solo está disponible mediante una conexión segura HTTPS.";
    if (error.message === "unsupported") return "Este navegador no permite detectar tu ubicación. Puedes elegir una ciudad manualmente.";
    if (error.message === "no_coverage") return "No hay ciudades de cobertura configuradas todavía.";
  }

  const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
  if (code === 1) return "El permiso de ubicación está bloqueado. Habilítalo para chile3x.cl en los ajustes del navegador o elige una ciudad manualmente.";
  if (code === 2) return "El dispositivo no pudo determinar tu ubicación. Comprueba que la ubicación esté activada o elige una ciudad manualmente.";
  if (code === 3) return "La ubicación tardó demasiado en responder. Inténtalo nuevamente o elige una ciudad manualmente.";
  return "No pudimos detectar tu ubicación. Puedes elegir una ciudad manualmente.";
}

export function requestNearestCoveredCity() {
  if (!window.isSecureContext) return Promise.reject(new Error("insecure_context"));
  if (!navigator.geolocation) return Promise.reject(new Error("unsupported"));

  return new Promise<NonNullable<ReturnType<typeof nearestCoveredCity>>>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = nearestCoveredCity(position.coords.latitude, position.coords.longitude);
      if (!nearest) {
        reject(new Error("no_coverage"));
        return;
      }
      resolve(nearest);
    }, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
    });
  });
}
