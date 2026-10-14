import { and, asc, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { forumPosts, forumSections, forumTopics } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { FORUM_MAX_SECTIONS, FORUM_PAGE_SIZE, forumSearchPattern } from "./forum-policy";

export async function requireForumAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/foro");
  if (!adminHasCapability(admin, "forum.manage")) redirect("/admin/acceso-denegado?reason=permission");
  return admin;
}

export async function getForumSections() {
  return (await getDb()).select({
    id: forumSections.id, groupName: forumSections.groupName, title: forumSections.title,
    description: forumSections.description, rules: forumSections.rules, sortOrder: forumSections.sortOrder,
    isArchived: forumSections.isArchived, updatedAt: forumSections.updatedAt,
    topics: sql<number>`(select count(*) from forum_topics t where t.section_id = forum_sections.id and t.trashed_at is null)`.mapWith(Number),
  }).from(forumSections).orderBy(asc(forumSections.isArchived), asc(forumSections.groupName), asc(forumSections.sortOrder), asc(forumSections.title)).limit(FORUM_MAX_SECTIONS);
}

export async function getForumTopicPage({ sectionId, search = "", page = 1, trash = false }: { sectionId?: string; search?: string; page?: number; trash?: boolean } = {}) {
  const db = await getDb();
  const where = and(sectionId ? eq(forumTopics.sectionId, sectionId) : undefined,
    trash ? isNotNull(forumTopics.trashedAt) : isNull(forumTopics.trashedAt),
    search ? sql`(${forumTopics.title} like ${forumSearchPattern(search)} escape '\\' or exists (select 1 from forum_posts p where p.topic_id = forum_topics.id and p.trashed_at is null and p.body like ${forumSearchPattern(search)} escape '\\'))` : undefined);
  const [rows, total] = await Promise.all([
    db.select({ id: forumTopics.id, title: forumTopics.title, sectionId: forumTopics.sectionId, sectionTitle: forumSections.title,
      authorName: forumTopics.authorName, isPinned: forumTopics.isPinned, isLocked: forumTopics.isLocked, trashedAt: forumTopics.trashedAt,
      updatedAt: forumTopics.updatedAt, createdAt: forumTopics.createdAt,
      posts: sql<number>`(select count(*) from forum_posts p where p.topic_id = forum_topics.id and p.trashed_at is null)`.mapWith(Number),
    }).from(forumTopics).innerJoin(forumSections, eq(forumSections.id, forumTopics.sectionId)).where(where)
      .orderBy(desc(forumTopics.isPinned), desc(forumTopics.updatedAt), asc(forumTopics.id)).limit(FORUM_PAGE_SIZE).offset((page - 1) * FORUM_PAGE_SIZE),
    db.select({ count: count() }).from(forumTopics).where(where),
  ]);
  return { rows, total: total[0]?.count ?? 0 };
}

export async function getForumThread(id: string, page: number) {
  const db = await getDb();
  const [topic] = await db.select().from(forumTopics).where(eq(forumTopics.id, id)).limit(1);
  if (!topic) return null;
  const [[section], posts, total] = await Promise.all([
    db.select().from(forumSections).where(eq(forumSections.id, topic.sectionId)).limit(1),
    db.select().from(forumPosts).where(eq(forumPosts.topicId, id)).orderBy(asc(forumPosts.createdAt), asc(forumPosts.id)).limit(FORUM_PAGE_SIZE).offset((page - 1) * FORUM_PAGE_SIZE),
    db.select({ count: count() }).from(forumPosts).where(eq(forumPosts.topicId, id)),
  ]);
  return { topic, section, posts, total: total[0]?.count ?? 0 };
}
