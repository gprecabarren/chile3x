import { cityDirectory, regions } from "@/app/locations";
import { validIsoDay } from "@/lib/chile-date-boundary";
import { boundedSampleFilter } from "@/lib/private-sample-filters";
import { SAMPLE_INTAKES_ADMIN_PATH } from "@/lib/private-sample-policy";

export function readIntakeFilters(params: Record<string, string | string[] | undefined>) {
  const place = boundedSampleFilter(params.lugar, 80);
  const city = cityDirectory.find(item => item.citySlug === place);
  const region = regions.find(item => item.cities.length && item.id === place);
  return {
    q: boundedSampleFilter(params.q, 80),
    status: params.estado === "pending" || params.estado === "processed" ? params.estado : "",
    place: city?.citySlug ?? region?.id ?? "",
    cities: city ? [city.city] : region?.cities ?? [],
    from: validIsoDay(boundedSampleFilter(params.desde)),
    to: validIsoDay(boundedSampleFilter(params.hasta)),
    page: typeof params.page === "string" && /^\d{1,6}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1,
  };
}

export function intakeListHref(filters: ReturnType<typeof readIntakeFilters>, page = filters.page) {
  const query = new URLSearchParams();
  const values = { q: filters.q, estado: filters.status, lugar: filters.place, desde: filters.from, hasta: filters.to };
  for (const [key, value] of Object.entries(values)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  return query.size ? `${SAMPLE_INTAKES_ADMIN_PATH}?${query}` : SAMPLE_INTAKES_ADMIN_PATH;
}
