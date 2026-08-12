import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/LegalPage";
import { readPublicationRules } from "@/lib/publication-rules";
import { getSiteSettings } from "@/lib/site-settings";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({ title: "Reglas de publicación", description: "Criterios de Chile3X para aprobar perfiles, agencias y arriendos.", path: "/reglas-de-publicacion" });

export const dynamic = "force-dynamic";

export default async function PublishingRulesPage() {
  const settings = await getSiteSettings();
  const rules = readPublicationRules(settings.publication_rules);
  return <LegalPage eyebrow="MODERACIÓN" title="Reglas de publicación">
    {rules.map((rule, index) => <section key={`${index}-${rule.title}`}><h2>{index + 1}. {rule.title}</h2><p>{rule.body}</p></section>)}
  </LegalPage>;
}
