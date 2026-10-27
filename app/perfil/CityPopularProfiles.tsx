import Image from 'next/image';
import Link from '@/app/NavigationLink';
import { getCityPopularProfiles } from '@/lib/city-popular-profiles';
import { formatRegionName } from '@/app/locations';
import { ActionIcon } from '@/app/ActionIcon';
import './popular-city.css';

export async function CityPopularProfiles({city,profileId,viewerId,directoryHref,directoryLabel}:{city:string;profileId:string;viewerId?:string;directoryHref:string;directoryLabel:string}){
 let result;try{result=await getCityPopularProfiles(city,profileId,viewerId);}catch{console.error('City recommendations unavailable',{city});return <section className="city-popular-profiles"><h2>Más anuncios en {city}</h2><p>No pudimos cargar las recomendaciones en este momento.</p><Link className="button button-outline" href={directoryHref}>{directoryLabel}<ActionIcon name="next"/></Link></section>;}
 const {ranked,cards}=result;
 return <section className="city-popular-profiles" aria-labelledby="city-popular-title"><header><div><p className="eyebrow">SIGUE EXPLORANDO</p><h2 id="city-popular-title">{ranked?'Los más vistos':'Más anuncios'} en {city}</h2><p>{ranked?'Según las visitas registradas durante las últimas 24 horas.':'Otras publicaciones de la misma ciudad.'}</p></div><Link className="button button-outline" href={directoryHref}>{directoryLabel}<ActionIcon name="next"/></Link></header>{cards.length>0&&<ol className="city-popular-list">{cards.map((card,index)=><li key={card.id}><Link className="city-popular-card" href={card.href} prefetch={false}><div className="city-popular-photo">{card.imageId?<Image src={`/media/${card.imageId}`} alt={`Foto de perfil de ${card.name}`} fill loading="lazy" fetchPriority="low" decoding="async" unoptimized sizes="72px"/>:<span aria-hidden="true">{card.name.slice(0,1)}</span>}{ranked&&<b aria-label={`Posición ${index+1}`}>{index+1}</b>}</div><div><span className={`city-popular-type${card.contentOnly?' is-content':''}`}>{card.typeLabel}</span><h3>{card.name}{card.age!==null&&<small>, {card.age}</small>}</h3><p>{card.city}{card.region&&`, ${formatRegionName(card.region)}`}</p><span className="city-popular-open">Ver anuncio <ActionIcon name="open"/></span></div></Link></li>)}</ol>}</section>;
}
export function CityPopularFallback({city}:{city:string}){return <section className="city-popular-profiles city-popular-loading" aria-label={`Recomendaciones de ${city}`}><p role="status">Cargando más anuncios de {city}…</p></section>;}
