import { isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  exclusiveContentMedia,
  newsMedia,
  operationalStorageSnapshots,
  profileMedia,
  profileReportEvidence,
  profileStatuses,
  profileVerificationFiles,
} from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { recordOperationalEvent } from "@/lib/operations";
import { scanR2Storage } from "@/lib/storage-audit";

const MAX_R2_OBJECTS_PER_SCAN = 20_000;
const MAX_REFERENCES_PER_SCAN = 20_000;

type D1StatsBinding = {
  prepare(query: string): { first<T>(): Promise<T | null> };
};

async function d1StorageStats(binding: D1Database) {
  try {
    const db = binding as D1StatsBinding;
    const [pageCount, pageSize, freePages] = await Promise.all([
      db.prepare("PRAGMA page_count").first<{ page_count?: number }>(),
      db.prepare("PRAGMA page_size").first<{ page_size?: number }>(),
      db.prepare("PRAGMA freelist_count").first<{ freelist_count?: number }>(),
    ]);
    const pages = Number(pageCount?.page_count);
    const size = Number(pageSize?.page_size);
    const free = Number(freePages?.freelist_count ?? 0);
    if (!Number.isFinite(pages) || !Number.isFinite(size)) return { used: null, allocated: null };
    return { used: Math.max(0, pages - free) * size, allocated: pages * size };
  } catch {
    return { used: null, allocated: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/api/auth/github/start?return_to=/admin", request.url), 303);
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No autorizado.", { status: 403 });
  const startedAt = performance.now();
  try {
    const [{ env }, db] = await Promise.all([import("cloudflare:workers"), getDb()]);
    if (!env.MEDIA) throw new Error("R2 binding unavailable");
    const d1StatsPromise = d1StorageStats(env.DB);
    const referencedKeys = new Set<string>();
    let inspectedReferences = 0;
    let referencesPartial = false;
    const referenceQueries = [
      (limit: number) => db.select({ key: profileMedia.r2Key }).from(profileMedia).limit(limit),
      (limit: number) => db.select({ key: profileStatuses.r2Key }).from(profileStatuses).where(isNotNull(profileStatuses.r2Key)).limit(limit),
      (limit: number) => db.select({ key: profileVerificationFiles.r2Key }).from(profileVerificationFiles).limit(limit),
      (limit: number) => db.select({ key: profileReportEvidence.r2Key }).from(profileReportEvidence).limit(limit),
      (limit: number) => db.select({ key: newsMedia.r2Key }).from(newsMedia).limit(limit),
      (limit: number) => db.select({ key: exclusiveContentMedia.r2Key }).from(exclusiveContentMedia).limit(limit),
    ];
    for (const query of referenceQueries) {
      const remaining = MAX_REFERENCES_PER_SCAN - inspectedReferences;
      if (remaining <= 0) {
        referencesPartial = true;
        break;
      }
      const rows = await query(remaining + 1);
      if (rows.length > remaining) referencesPartial = true;
      for (const row of rows.slice(0, remaining)) {
        inspectedReferences += 1;
        if (row.key) referencedKeys.add(row.key);
      }
      if (referencesPartial) break;
    }
    const scan = await scanR2Storage(env.MEDIA, referencedKeys, MAX_R2_OBJECTS_PER_SCAN);
    const d1Stats = await d1StatsPromise;
    const durationMs = Math.round(performance.now() - startedAt);
    const { objectCount, r2Bytes, orphanObjectCount, orphanBytes } = scan;
    const status = referencesPartial || scan.status === "partial" ? "partial" : "complete";
    const missingObjectCount = referencesPartial ? null : scan.missingObjectCount;
    await db.insert(operationalStorageSnapshots).values({
      id: `storage_${crypto.randomUUID()}`,
      status,
      d1UsedBytes: d1Stats.used,
      d1AllocatedBytes: d1Stats.allocated,
      r2ObjectCount: objectCount,
      r2Bytes,
      referencedObjectCount: referencedKeys.size,
      orphanObjectCount,
      orphanBytes,
      missingObjectCount,
      scanDurationMs: durationMs,
      scannedBy: admin.id,
    });
    await recordOperationalEvent({ category: "storage", eventName: "storage.audit", outcome: "success", durationMs, detail: status === "partial" ? "La revisión alcanzó el límite seguro y quedó parcial." : "Revisión agregada de D1 y R2 completada." });
    await recordAdminAudit(admin, {
      category: "settings",
      action: "operations.storage_scan",
      entityType: "settings",
      entityId: "storage",
      entityLabel: "Almacenamiento D1/R2",
      summary: `${admin.githubLogin} actualizó la revisión de almacenamiento.`,
      metadata: { status, objectCount, referencedObjectCount: referencedKeys.size, orphanObjectCount, missingObjectCount },
    });
    return NextResponse.redirect(new URL("/admin?ops_notice=storage_refreshed#panel-operativo", request.url), 303);
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error("Storage audit failed", { error });
    await recordOperationalEvent({ category: "storage", eventName: "storage.audit", outcome: "failure", durationMs, detail: "No fue posible completar la revisión de almacenamiento." });
    await recordAdminAudit(admin, {
      category: "settings",
      action: "operations.storage_scan",
      entityType: "settings",
      entityId: "storage",
      entityLabel: "Almacenamiento D1/R2",
      summary: `${admin.githubLogin} intentó actualizar la revisión de almacenamiento.`,
      outcome: "failure",
    });
    return NextResponse.redirect(new URL("/admin?ops_notice=storage_error#panel-operativo", request.url), 303);
  }
}
