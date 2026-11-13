import { intakeListHref, readIntakeFilters } from "@/lib/private-sample-intake-filters";

export function GET(request: Request) {
  const url = new URL(request.url);
  const filters = readIntakeFilters(Object.fromEntries(url.searchParams));
  return Response.redirect(new URL(intakeListHref(filters), url), 308);
}
