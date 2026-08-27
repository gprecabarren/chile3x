import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";

function unavailable() {
  return NextResponse.json({ error: "El contenido exclusivo ahora se administra desde Mi cuenta > Mi contenido." }, { status: 410 });
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }); }
  return unavailable();
}

export async function DELETE(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }); }
  return unavailable();
}
