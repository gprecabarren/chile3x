import Link from "next/link";
import { formatCompactRegionName, getCityReferenceMap } from "@/app/locations";
import { getCityPath } from "@/lib/directory";

export function ProfileLocationCard({ city, region, referenceLocation }: { city: string; region: string; referenceLocation?: string | null }) {
  const { embedUrl } = getCityReferenceMap(city, region);
  return <aside className="profile-detail-aside profile-location-card">
    <p className="eyebrow">UBICACIÓN</p>
    <h2>{city}, <span>{formatCompactRegionName(region)}</span></h2>
    {referenceLocation && <p className="profile-location-note">{referenceLocation}</p>}
    <div className="profile-location-map-heading">
      <h3>Ubicación referencial</h3>
    </div>
    <iframe className="profile-location-map" src={embedUrl} title={`Mapa referencial de ${city}, ${formatCompactRegionName(region)}`} loading="lazy" referrerPolicy="no-referrer" allowFullScreen />
    <small className="profile-location-disclaimer">Referencia de la ciudad, no una dirección exacta.</small>
    <Link className="button button-outline" href={getCityPath(city)}>Ver más en {city}</Link>
  </aside>;
}
