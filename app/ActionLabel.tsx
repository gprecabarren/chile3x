import { isValidElement, type ReactNode } from "react";
import { actionIconForLabel } from "@/lib/action-icon-policy";
import { ActionIcon } from "./ActionIcon";

function labelText(children: ReactNode): string | null {
  if (children === null || children === undefined || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    const labels = children.map(labelText);
    return labels.some(text => text === null) ? null : labels.join("");
  }
  if (isValidElement<{ children?: ReactNode; "aria-hidden"?: boolean | "true" | "false" }>(children)) {
    // Already illustrated controls, avatars, spinners and complex custom
    // components keep their existing markup and do not gain a second icon.
    if (typeof children.type === "string" && ["span", "strong", "b", "em", "small"].includes(children.type) && !children.props["aria-hidden"]) return labelText(children.props.children);
  }
  return null;
}

export function ActionLabel({ children }: { children: ReactNode }) {
  const text = labelText(children);
  const icon = text ? actionIconForLabel(text) : null;
  return <>{icon && <ActionIcon name={icon} />}{children}</>;
}
