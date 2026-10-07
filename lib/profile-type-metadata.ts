const rentalFields = new Set([
  "instagram_url", "availability", "room_type", "furnished", "private_bathroom", "exterior_window", "room_size",
  "common_expenses", "deposit", "minimum_rental", "immediate_available", "wifi", "utilities_included", "kitchen", "laundry",
]);

// Old records may contain fields from another listing type. Keep them stored
// until the owner edits, but never expose Escort attributes on a rental.
export function profileMetadataForType(type: string, metadata: Record<string, string>) {
  return type === "rental" ? Object.fromEntries(Object.entries(metadata).filter(([key]) => rentalFields.has(key))) : metadata;
}
