"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { beginUserNavigation } from "@/lib/user-navigation-progress";

/** Navigation stays client-side, but only requests a page when it is opened.
 * Global menus otherwise render many unused RSC pages concurrently, consuming
 * the Free Worker CPU allowance and D1 reads. Explicit opt-in remains possible.
 */
export default function NavigationLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={props.prefetch ?? false} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || (props.target && props.target !== "_self") || props.download) return;
    const href = event.currentTarget.href;
    if (href) beginUserNavigation(href);
  }} />;
}
