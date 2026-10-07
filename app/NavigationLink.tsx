"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/** Navigation stays client-side, but only requests a page when it is opened.
 * Global menus otherwise render many unused RSC pages concurrently, consuming
 * the Free Worker CPU allowance and D1 reads. Explicit opt-in remains possible.
 */
export default function NavigationLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={props.prefetch ?? false} />;
}
