import { getDb } from "@/db";
import { adminNotifications } from "@/db/schema";

export type AdminNotificationKind = "account_registered" | "profile_created" | "profile_updated";

export async function createAdminNotification(input: {
  kind: AdminNotificationKind;
  summary: string;
  actorUserId?: string | null;
  profileId?: string | null;
}) {
  try {
    await (await getDb()).insert(adminNotifications).values({
      id: `admin_notification_${crypto.randomUUID()}`,
      kind: input.kind,
      actorUserId: input.actorUserId ?? null,
      profileId: input.profileId ?? null,
      summary: input.summary.slice(0, 300),
    });
  } catch (error) {
    // A notification must never make the user-facing action fail. The primary
    // record remains the source of truth and the failure stays observable.
    console.error("Admin notification could not be created", { kind: input.kind, error });
  }
}
