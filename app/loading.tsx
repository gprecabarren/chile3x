import { OfficialChile3xLogo } from "./OfficialChile3xLogo";

export default function Loading() {
  return <div className="route-loading" role="status" aria-live="polite">
    <div className="route-loading-mark">
      <OfficialChile3xLogo />
      <span className="route-loading-hearts" aria-hidden="true"><i>♥</i><i>♥</i></span>
      <strong>Cargando…</strong>
    </div>
  </div>;
}
