"use client";

import { createContext } from "react";
import type { WhatsappPanelPlacement } from "@/lib/portal-whatsapp";

// Shared by header, footer and floating controls. Only one dialog is rendered.
export const WhatsappMenuContext = createContext<{
  isOpen: boolean;
  openMenu: (placement: WhatsappPanelPlacement, opener: HTMLElement) => boolean;
} | null>(null);
