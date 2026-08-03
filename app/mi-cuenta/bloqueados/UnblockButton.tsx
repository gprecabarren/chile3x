"use client";
import { useState } from "react";
export function UnblockButton({ profileId }: { profileId: string }) {
  const [busy, setBusy] = useState(false);
  async function unblock() { setBusy(true); const response = await fetch(`/api/perfiles/${profileId}/bloqueo`, { method: "DELETE" }); if (response.ok) window.location.reload(); else setBusy(false); }
  return <button className="button button-outline" type="button" disabled={busy} onClick={unblock}>{busy ? "Restaurando…" : "Volver a mostrar"}</button>;
}
