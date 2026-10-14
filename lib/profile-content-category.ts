type ContentProfile = { type: string; contentOnly?: boolean; details?: { metadata: Record<string, string> }; tags?: string[] };

/** A self-declared public category, never inferred from a private library or links. */
export function isContentOnly(profile: ContentProfile) {
  return profile.type === "escort" && (profile.contentOnly === true || profile.details?.metadata.content_only === "1");
}

export function sellsContent(profile: ContentProfile) {
  return profile.type === "escort" && (isContentOnly(profile) || profile.tags?.includes("venta-contenido") === true);
}

export function publicProfileTypeLabel(profile: ContentProfile) {
  return isContentOnly(profile) ? "Venta de contenido" : profile.type === "escort" ? "Escort" : profile.type === "agency" ? "Agencia" : "Arriendo";
}

export function profileMatchesDirectoryCategory(profile: ContentProfile & { tier: string }, category?: string) {
  if (!category) return true;
  if (category === "contenido") return sellsContent(profile);
  if (category === "masajes") return profile.type === "escort" && !isContentOnly(profile) && profile.tags?.includes("masajes") === true;
  if (["vip", "premium", "bronze"].includes(category)) return profile.type === "escort" && !isContentOnly(profile) && profile.tier === category;
  return profile.type === category;
}
