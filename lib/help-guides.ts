import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { helpGuides } from "@/db/schema";
import type { HelpAudience, HelpTopic } from "@/lib/help-types";
import { helpGuideIsVisible } from "@/lib/help-guide-policy";

export async function getStoredHelpTopics(audience: HelpAudience, options: { capabilities?: readonly string[]; tester?: boolean } = {}): Promise<HelpTopic[]> {
  const conditions = [eq(helpGuides.isDeleted, false), eq(helpGuides.isPublished, true), inArray(helpGuides.audience, [audience, "all"])];
  if (!options.tester) conditions.push(eq(helpGuides.testerOnly, false));
  if (audience === "account") conditions.push(isNull(helpGuides.capability));
  else conditions.push(or(isNull(helpGuides.capability), inArray(helpGuides.capability, [...options.capabilities ?? []]))!);
  const rows = await (await getDb()).select().from(helpGuides).where(and(...conditions)).orderBy(asc(helpGuides.category), asc(helpGuides.title)).limit(300);
  return rows.flatMap(row => {
    try {
      const aliases: unknown = JSON.parse(row.aliases), steps: unknown = JSON.parse(row.steps);
      if (!Array.isArray(aliases) || !aliases.every(item=>typeof item==='string') || !Array.isArray(steps) || !steps.every(item=>typeof item==='string')) return [];
      const topic: HelpTopic = { id:row.id, audience:row.audience, category:row.category, title:row.title, aliases, summary:row.summary, steps,
        link:{href:row.linkHref,label:row.linkLabel,...(row.linkTarget?{target:row.linkTarget as HelpTopic["link"]["target"]}:{})},
        ...(row.capability?{capability:row.capability as HelpTopic["capability"]}:{}), testerOnly:row.testerOnly };
      return helpGuideIsVisible(topic,audience,options)?[topic]:[];
    } catch { return []; }
  });
}
