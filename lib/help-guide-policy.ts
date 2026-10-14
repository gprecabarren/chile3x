import { ADMIN_CAPABILITY_LABELS, type AdminCapability } from "./admin-permissions";
import type { HelpTopic } from "./help-types";

const TARGETS = ["edit", "media", "documents", "stories", "stats", "preview"] as const;
export function validHelpDestination(href: string, audience: HelpTopic["audience"]) {
  if (!href.startsWith("/") || href.startsWith("//") || /[\\\u0000-\u0020\u007f]|%/u.test(href) || href.length > 300) return false;
  const path = href.split(/[?#]/)[0];
  if (path.split("/").some(segment => segment === "." || segment === "..")) return false;
  if (path.startsWith("/api/") || path === "/api") return false;
  if (audience !== "admin") return /^\/(?:mi-cuenta|perfil|escorts|agencias|arriendos)(?:\/|$)|^\/(?:contacto|privacidad|terminos|registro|ingresar|recuperar-clave)$/.test(path);
  return /^\/(?:admin|foro|mi-cuenta)(?:\/|$)|^\/(?:contacto|privacidad|terminos)$/.test(path);
}
export function readHelpGuide(form: FormData) {
  const text = (name: string, minimum: number, maximum: number) => {
    const value = String(form.get(name) ?? "").trim();
    if (value.length < minimum || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) throw new Error(`Revisa ${name}: admite entre ${minimum} y ${maximum} caracteres.`);
    return value;
  };
  const audience = text("audience", 3, 10) as HelpTopic["audience"];
  if (!["account", "admin", "all"].includes(audience)) throw new Error("Selecciona una audiencia válida.");
  const category = text("category", 2, 80), title = text("title", 3, 160), summary = text("summary", 3, 1200);
  const steps = text("steps", 3, 6000).split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (!steps.length || steps.length > 15 || steps.some(step => step.length > 700)) throw new Error("Utiliza hasta 15 pasos, uno por línea y de hasta 700 caracteres cada uno.");
  const aliases = text("aliases", 0, 1500).split(",").map(item=>item.trim()).filter(Boolean);
  if (aliases.length > 30 || aliases.some(alias=>alias.length>80)) throw new Error("Utiliza hasta 30 palabras clave de 80 caracteres, separadas por comas.");
  const linkHref = text("link_href", 1, 300), linkLabel = text("link_label", 2, 100), capability = text("capability", 0, 80) || null;
  const linkTarget = text("link_target",0,20) || null;
  const testerOnly = form.get("tester_only") === "yes";
  if (!validHelpDestination(linkHref,audience)) throw new Error("El enlace no es una sección local permitida para esa audiencia.");
  if (capability && !(capability in ADMIN_CAPABILITY_LABELS)) throw new Error("El permiso administrativo no es válido.");
  if (audience !== "admin" && capability) throw new Error("Una guía de usuarios no puede requerir ni exponer permisos administrativos.");
  if (audience !== "admin" && /\/(?:admin|api\/admin|foro)(?:\/|\b)/i.test([title,category,summary,...steps,...aliases].join("\n"))) throw new Error("Los enlaces y flujos administrativos deben permanecer en una guía exclusiva para administración.");
  if (linkTarget && !TARGETS.includes(linkTarget as typeof TARGETS[number])) throw new Error("El destino dinámico no es válido.");
  return { audience, category, title, summary, steps: JSON.stringify(steps), aliases: JSON.stringify(aliases), linkHref, linkLabel, linkTarget, capability, testerOnly, isPublished: form.get("is_published") === "yes" };
}
export function helpGuideIsVisible(topic: HelpTopic, audience: "account" | "admin", options: { capabilities?: readonly string[]; tester?: boolean } = {}) {
  if (topic.audience !== "all" && topic.audience !== audience) return false;
  if (topic.testerOnly && !options.tester) return false;
  if (audience === "account" && (topic.capability || !validHelpDestination(topic.link.href, "account"))) return false;
  return !topic.capability || (options.capabilities ?? []).includes(topic.capability as AdminCapability);
}
