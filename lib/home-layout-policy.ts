export const HOME_LAYOUTS = ["classic", "compact"] as const;
export type HomeLayout = typeof HOME_LAYOUTS[number];
export const DEFAULT_HOME_LAYOUT: HomeLayout = "classic";
export const HOME_LAYOUT_HEADER = "x-chile3x-home-layout";

export function isHomeLayout(value: unknown): value is HomeLayout {
  return value === "classic" || value === "compact";
}

export function readHomeLayout(value: unknown): HomeLayout {
  return isHomeLayout(value) ? value : DEFAULT_HOME_LAYOUT;
}

export const homeLayoutLabels: Record<HomeLayout, string> = {
  classic: "Actual · presentación completa",
  compact: "Alternativo · ciudades primero",
};
