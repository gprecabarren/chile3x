import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { adminMutationReceipts } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const headers = {"cache-control":"private, no-store", "x-robots-tag":"noindex, nofollow"};
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({error:"Tu sesión administrativa terminó."},{status:401,headers});
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-f\d-]{36}$/i.test(id)) return Response.json({error:"Referencia no válida."},{status:400,headers});
  const [row] = await (await getDb()).select({resourceKey:adminMutationReceipts.resourceKey}).from(adminMutationReceipts)
    .where(and(eq(adminMutationReceipts.id,id),eq(adminMutationReceipts.actorId,admin.id),gt(adminMutationReceipts.expiresAt,Date.now()))).limit(1);
  return Response.json({committed:!!row,resourceKey:row?.resourceKey ?? null},{headers});
}
