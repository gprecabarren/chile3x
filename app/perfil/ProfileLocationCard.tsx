import { ActionButton } from "@/app/ActionButton";
import Link from "@/app/NavigationLink";
import { formatCompactRegionName, getCityReferenceMap } from "@/app/locations";
import { getCityPath } from "@/lib/directory";

export function ProfileLocationCard({ city, region, referenceLocation, preview = false }: { city: string; region: string; referenceLocation?: string | null; preview?: boolean }) {
  const { embedUrl } = getCityReferenceMap(city, region);
  return <aside className="profile-detail-aside profile-location-card">
    <p className="eyebrow">UBICACIÓN</p>
    <h2>{city}, <span>{formatCompactRegionName(region)}</span></h2>
    {referenceLocation && <p className="profile-location-note">{referenceLocation}</p>}
    <div className="profile-location-map-heading">
      <h3>Ubicación referencial</h3>
    </div>
    <iframe className="profile-location-map" src={embedUrl} title={`Mapa referencial de ${city}, ${formatCompactRegionName(region)}`} loading="lazy" referrerPolicy="no-referrer" allowFullScreen inert={preview || undefined} tabIndex={preview ? -1 : undefined} />
    <small className="profile-location-disclaimer">Referencia de la ciudad, no una dirección exacta.</small>
    {preview ? <ActionButton className="button button-outline" type="button" disabled>Ver más en {city}</ActionButton> : <Link className="button button-outline" href={getCityPath(city)}>Ver más en {city}</Link>}
  </aside>;
}
