import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { operationalEvents, operationalStorageSnapshots } from "@/db/schema";

export const OPERATIONAL_CATEGORIES = {
  email: "Correos",
  authentication: "Autenticación",
  application: "Aplicación",
  storage: "Almacenamiento",
  audit: "Auditoría",
} as const;

export type OperationalCategory = keyof typeof OPERATIONAL_CATEGORIES;
export type OperationalOutcome = "success" | "failure";
export type OperationalPeriod = "24h" | "7d" | "30d" | "all";

export type OperationalFilters = {
  period: OperationalPeriod;
  category: OperationalCategory | "all";
  outcome: OperationalOutcome | "all";
};

const periodMilliseconds: Record<Exclude<OperationalPeriod, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function safeMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value) return null;
  const serialized = JSON.stringify(value, (key, item) => /email|ip|token|secret|key|password/i.test(key) ? "[protegido]" : item);
  return serialized.slice(0, 2_000);
}

export async function recordOperationalEvent(input: {
  category: OperationalCategory;
  eventName: string;
  outcome: OperationalOutcome;
  durationMs?: number | null;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await (await getDb()).insert(operationalEvents).values({
      id: `operation_${crypto.randomUUID()}`,
      category: input.category,
      eventName: input.eventName.slice(0, 100),
      outcome: input.outcome,
      durationMs: Number.isFinite(input.durationMs) ? Math.max(0, Math.round(input.durationMs ?? 0)) : null,
      detail: input.detail?.slice(0, 300) ?? null,
      metadata: safeMetadata(input.metadata),
    });
  } catch (error) {
    console.error("Unable to record operational event", { eventName: input.eventName, error });
  }
}

export function readOperationalFilters(params: Record<string, string | undefined>): OperationalFilters {
  const period: OperationalPeriod = params.ops_period === "7d" || params.ops_period === "30d" || params.ops_period === "all" ? params.ops_period : "24h";
  const category = params.ops_category && Object.hasOwn(OPERATIONAL_CATEGORIES, params.ops_category) ? params.ops_category as OperationalCategory : "all";
  const outcome: OperationalOutcome | "all" = params.ops_status === "success" || params.ops_status === "failure" ? params.ops_status : "all";
  return { period, category, outcome };
}

function periodCondition(period: OperationalPeriod): SQL | undefined {
  if (period === "all") return undefined;
  const since = new Date(Date.now() - periodMilliseconds[period]).toISOString();
  return sql`datetime(${operationalEvents.createdAt}) >= datetime(${since})`;
}

export async function getOperationalDashboard(filters: OperationalFilters) {
  const db = await getDb();
  const period = periodCondition(filters.period);
  const listConditions: SQL[] = [];
  if (period) listConditions.push(period);
  if (filters.category !== "all") listConditions.push(eq(operationalEvents.category, filters.category));
  if (filters.outcome !== "all") listConditions.push(eq(operationalEvents.outcome, filters.outcome));
  const listWhere = listConditions.length ? and(...listConditions) : undefined;
  const periodConditions = period ? [period] : [];
  const failureWhere = and(...periodConditions, eq(operationalEvents.outcome, "failure"));
  const emailFailureWhere = and(...periodConditions, eq(operationalEvents.category, "email"), eq(operationalEvents.outcome, "failure"));
  const durationWhere = periodConditions.length ? and(...periodConditions, sql`${operationalEvents.durationMs} is not null`) : sql`${operationalEvents.durationMs} is not null`;

  const [[failureCount], [emailFailureCount], [duration], [eventCount], events, [storage]] = await Promise.all([
    db.select({ total: count() }).from(operationalEvents).where(failureWhere),
    db.select({ total: count() }).from(operationalEvents).where(emailFailureWhere),
    db.select({ average: sql<number>`coalesce(avg(${operationalEvents.durationMs}), 0)` }).from(operationalEvents).where(durationWhere),
    db.select({ total: count() }).from(operationalEvents).where(listWhere),
    db.select().from(operationalEvents).where(listWhere).orderBy(desc(operationalEvents.createdAt)).limit(20),
    db.select().from(operationalStorageSnapshots).orderBy(desc(operationalStorageSnapshots.createdAt)).limit(1),
  ]);

  return {
    failureCount: Number(failureCount?.total ?? 0),
    emailFailureCount: Number(emailFailureCount?.total ?? 0),
    averageDurationMs: Math.round(Number(duration?.average ?? 0)),
    eventCount: Number(eventCount?.total ?? 0),
    events,
    storage: storage ?? null,
  };
}

export function operationalDate(value: string) {
  const instant = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(instant));
}

export function formatBytes(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "No disponible";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toLocaleString("es-CL", { maximumFractionDigits: size >= 10 ? 1 : 2 })} ${units[unit]}`;
}
