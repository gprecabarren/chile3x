export const VISUAL_THEMES = ["classic", "liquid-glass"] as const;
export type VisualTheme = typeof VISUAL_THEMES[number];
export const VISUAL_THEME_HEADER = "x-chile3x-visual-theme";
export const GLASS_STYLESHEET = "/assets/theme-liquid-glass-20261023-v4.css";
export const visualThemeLabels: Record<VisualTheme, string> = { classic: "Actual · oscuro clásico", "liquid-glass": "Liquid Glass · cristal oscuro" };

export function isVisualTheme(value: unknown): value is VisualTheme {
  return value === "classic" || value === "liquid-glass";
}

export function readVisualTheme(value: unknown): VisualTheme {
  return isVisualTheme(value) ? value : "classic";
}

export function previewVisualTheme(path: string): VisualTheme | null {
  const match = /^\/admin\/vista-previa-tema\/(classic|liquid-glass)$/.exec(path);
  return match ? readVisualTheme(match[1]) : null;
}
