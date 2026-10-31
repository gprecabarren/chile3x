export type CreationSource = "self" | "admin" | "agency" | "unknown";

export function creationSourceLabel(source: CreationSource, adminLogin: string | null) {
  if(source==="agency")return "Creado desde una agencia";
  if (source === "self") return "Por la persona titular";
  if (source === "admin") return adminLogin ? `Por administración · @${adminLogin}` : "Por administración · identidad no registrada";
  return "Origen sin verificar (registro anterior)";
}
