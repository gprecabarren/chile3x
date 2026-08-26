import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { bugReports } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

type ReportPayload = {
  title?: unknown;
  description?: unknown;
  pageUrl?: unknown;
  pageTitle?: unknown;
  deviceType?: unknown;
  viewport?: unknown;
  userAgent?: unknown;
};

function stringValue(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }); }
  const user = await getCurrentUser();
  if (user?.role !== "tester") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let payload: ReportPayload;
  try { payload = await request.json() as ReportPayload; } catch { return NextResponse.json({ error: "Formato de reporte no válido." }, { status: 400 }); }
  const title = stringValue(payload.title, 120);
  const description = stringValue(payload.description, 2000);
  const pageUrl = stringValue(payload.pageUrl, 1800);
  const pageTitle = stringValue(payload.pageTitle, 200);
  const viewport = stringValue(payload.viewport, 80);
  const userAgent = stringValue(payload.userAgent, 500);
  const deviceType = payload.deviceType === "mobile" ? "mobile" : payload.deviceType === "desktop" ? "desktop" : "";
  if (title.length < 3 || description.length < 10 || !pageUrl || !deviceType) return NextResponse.json({ error: "Completa el resumen y una descripción de al menos 10 caracteres." }, { status: 400 });

  let target: URL;
  try { target = new URL(pageUrl, request.url); } catch { return NextResponse.json({ error: "La página reportada no es válida." }, { status: 400 }); }
  if (target.origin !== new URL(request.url).origin) return NextResponse.json({ error: "La página reportada no es válida." }, { status: 400 });
  await (await getDb()).insert(bugReports).values({
    id: `bug_${crypto.randomUUID()}`,
    reporterId: user.id,
    title,
    description,
    pageUrl: `${target.pathname}${target.search}`,
    pageTitle,
    deviceType: deviceType as "desktop" | "mobile",
    viewport,
    userAgent,
  });
  return NextResponse.json({ message: "Reporte enviado. Puedes seguirlo en Mis pruebas." }, { status: 201 });
}
