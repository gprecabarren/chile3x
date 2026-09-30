export type CreationSource = "self" | "admin" | "unknown";

export function creationSourceLabel(source: CreationSource, adminLogin: string | null) {
  if (source === "self") return "Por la persona titular";
  if (source === "admin") return adminLogin ? `Por administración · @${adminLogin}` : "Por administración · identidad no registrada";
  return "Origen sin verificar (registro anterior)";
}
