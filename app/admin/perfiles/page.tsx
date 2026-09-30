import { redirect } from "next/navigation";

// Preserve bookmarked administrative links while the canonical panel URL changes.
export default async function LegacyProfilesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  redirect(`/admin/anuncios-publicaciones${params.size ? `?${params}` : ""}`);
}
