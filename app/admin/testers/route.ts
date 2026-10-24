import { NextRequest, NextResponse } from "next/server";
import { legacyTestingPath } from "@/lib/admin-testing-policy";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL(legacyTestingPath(new URL(request.url).searchParams), request.url), 307);
}
