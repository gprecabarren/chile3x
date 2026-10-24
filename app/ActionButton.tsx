"use client";

import type { ComponentProps } from "react";
import { ActionLabel } from "./ActionLabel";

/** Native attributes, refs, submission and handlers remain unchanged. Icons
 * are declarative, rendered on the server too: no DOM observer or mutation. */
export function ActionButton({ children, ...props }: ComponentProps<"button">) {
  return <button {...props}><ActionLabel>{children}</ActionLabel></button>;
}

export function ActionAnchor({ children, ...props }: ComponentProps<"a">) {
  return <a {...props}><ActionLabel>{children}</ActionLabel></a>;
}
