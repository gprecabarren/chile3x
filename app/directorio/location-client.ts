export function savePreferredCity(citySlug: string) {
  document.cookie = `chile3x_preferred_city_v2=${encodeURIComponent(citySlug)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  document.cookie = "chile3x_preferred_city=; Path=/; Max-Age=0; SameSite=Lax; Secure";
}

export function clearPreferredCity() {
  document.cookie = "chile3x_preferred_city_v2=; Path=/; Max-Age=0; SameSite=Lax; Secure";
  document.cookie = "chile3x_preferred_city=; Path=/; Max-Age=0; SameSite=Lax; Secure";
}
