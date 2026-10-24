import { NextRequest, NextResponse } from "next/server";
import { testingBugReportsPath } from "@/lib/admin-testing-policy";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams;
  return NextResponse.redirect(new URL(testingBugReportsPath(query.get("estado"), query.get("notice") === "updated"), request.url), 307);
}
