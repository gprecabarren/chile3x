import type {Metadata} from "next";
import {cookies} from "next/headers";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples,resolvePrivateSample,canOpenSample,privateSampleView} from "@/lib/private-samples";
import {SAMPLE_COOKIE,sampleCanEdit} from "@/lib/private-sample-policy";
import ProfilePage from "@/app/perfil/[slug]/page";
import {SampleAccess} from "../SampleAccess";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Muestra privada · Chile3X",description:"Presentación privada, no publicada en el directorio.",robots:{index:false,follow:false,noarchive:true,nosnippet:true},alternates:{canonical:null},openGraph:{title:"Muestra privada · Chile3X",description:"Enlace privado de una presentación.",images:[]},twitter:{card:"summary",title:"Muestra privada · Chile3X",images:[]}};
export default async function SamplePage({params}:{params:Promise<{sampleId:string}>}) {
  const {sampleId}=await params;
  const admin=await getCurrentAdmin();
  const row=canManageSamples(admin)?await resolvePrivateSample(sampleId):await canOpenSample(sampleId,(await cookies()).get(SAMPLE_COOKIE)?.value);
  if(!row||!sampleCanEdit(row))return <SampleAccess id={sampleId}/>;
  return ProfilePage({params:Promise.resolve({slug:sampleId}),searchParams:Promise.resolve({}),sample:await privateSampleView(row,sampleId)});
}
