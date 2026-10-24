import { NextRequest, NextResponse } from "next/server";
import { HOME_TESTING_PATH } from "@/lib/admin-testing-policy";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const saved = new URL(request.url).searchParams.get("saved") === "1";
  return NextResponse.redirect(new URL(`${HOME_TESTING_PATH}${saved ? "&saved=1" : ""}`, request.url), 307);
}
