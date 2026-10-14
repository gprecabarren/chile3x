import { isContentOnly } from "./profile-content-category.ts";

type ProfileSeoContent = {
  type: string;
  displayName: string;
  city: string;
  shortDescription?: string | null;
  contentOnly?: boolean;
  details?: { metadata: Record<string, string> };
};

const clean = (value: string | null | undefined) => (value ?? "").trim().replace(/\s+/g, " ");
const typeLabel = (profile: ProfileSeoContent) => isContentOnly(profile) ? "venta de contenido" : profile.type === "escort" ? "escort" : profile.type === "agency" ? "agencia de escorts" : "arriendo para escorts";

// Keep the search intent stable instead of stuffing every optional tag/service
// into titles. Only real, public summary text is added to descriptions.
export function profileSeoTitle(profile: ProfileSeoContent) {
  return `${clean(profile.displayName)}, ${typeLabel(profile)} en ${clean(profile.city)}`;
}

export function profileSeoDescription(profile: ProfileSeoContent, regionName: string) {
  const summary = clean(profile.shortDescription);
  const location = [clean(profile.city), clean(regionName)].filter(Boolean).join(", ");
  const text = `${clean(profile.displayName)}: ${typeLabel(profile)} en ${location}.${summary ? ` ${summary}` : ""}`;
  // Truncate on a word boundary, never in the middle of an optional phrase.
  return text.length <= 160 ? text : text.slice(0, 157).replace(/\s+\S*$/, "").trimEnd() + "…";
}
