import { getCurrentUser } from "@/lib/auth";
import { countUnreadMessages } from "@/lib/internal-messages";
import { countPendingReceivedReviews } from "@/lib/profile-interactions";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow", vary: "Cookie" };
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401, headers });
  const [count, pendingReviews] = await Promise.all([countUnreadMessages(user.id), countPendingReceivedReviews(user.id)]);
  return Response.json({ count, pendingReviews }, { headers });
}
