import type { AdminCapability } from "./admin-permissions";

export const HELP_REVIEWED_AT = "2026-10-13";
export const HELP_BETA_NOTICE = "Ayuda beta: las respuestas pueden contener errores. Verifica los pasos y, si no resuelven tu problema, contacta al equipo por WhatsApp.";

export type HelpAudience = "account" | "admin";
export type HelpTopic = {
  id: string;
  audience: HelpAudience | "all";
  category: string;
  title: string;
  aliases: string[];
  summary: string;
  steps: string[];
  link: { href: string; label: string; target?: "edit" | "media" | "documents" | "stories" | "stats" | "preview" };
  capability?: AdminCapability;
  testerOnly?: boolean;
};
export type HelpProfile = { id: string; name: string; publicPath: string };
export type HelpSearchResult = { topic: HelpTopic; score: number; coverage: number; exact: boolean };
