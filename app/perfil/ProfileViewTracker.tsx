"use client";

import { useEffect } from "react";

export function ProfileViewTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    void fetch(`/api/perfiles/${profileId}/visualizacion`, { method: "POST", credentials: "same-origin" }).catch(() => undefined);
  }, [profileId]);

  return null;
}
