"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PrivacyConsent = dynamic(() => import("./PrivacyConsent").then((module) => module.PrivacyConsent), { ssr: false });
const FormProgress = dynamic(() => import("./FormProgress").then((module) => module.FormProgress), { ssr: false });

export function DeferredClientFeatures() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const browser = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (browser.requestIdleCallback) {
      const id = browser.requestIdleCallback(() => setReady(true), { timeout: 1_200 });
      return () => browser.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 500);
    return () => window.clearTimeout(id);
  }, []);
  return ready ? <><PrivacyConsent /><FormProgress /></> : null;
}

