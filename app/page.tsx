import type { Metadata } from "next";
import { headers } from "next/headers";
import { socialCardImage,socialCardImageUrl } from "@/lib/seo";
import {getSiteSettings} from "@/lib/site-settings";
import {HOME_LAYOUT_HEADER,readHomeLayout} from "@/lib/home-layout-policy";
import {parseHomeTexts} from "@/lib/home-content-policy";
import {HomeContent} from "./HomeContent";
export const dynamic="force-dynamic";
async function activeHome() {
  const [requestHeaders,settings]=await Promise.all([headers(),getSiteSettings()]);
  const layout=readHomeLayout(requestHeaders.get(HOME_LAYOUT_HEADER)??settings.home_layout);
  return {layout,copy:parseHomeTexts(settings[`home_content_${layout}`],layout)};
}
export async function generateMetadata():Promise<Metadata> {
  const {copy}=await activeHome();
  return {title:{absolute:copy.seoTitle},description:copy.seoDescription,alternates:{canonical:"/"},openGraph:{title:copy.socialTitle||copy.seoTitle,description:copy.socialDescription||copy.seoDescription,url:"/",locale:"es_CL",type:"website",siteName:"Chile3X",images:[socialCardImage]},twitter:{card:"summary_large_image",title:copy.socialTitle||copy.seoTitle,description:copy.socialDescription||copy.seoDescription,images:[socialCardImageUrl]}};
}
export default async function Home(){const {layout}=await activeHome();return <HomeContent layout={layout}/>;}
