import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";

/** Same moderation endpoint and permissions on every administrative surface. */
export function MediaModerationActions({ profileId, mediaId, revision, status, returnTo }: {
  profileId: string; mediaId: string; revision: number; status: string; returnTo: string;
}) {
  const approved = status === "approved";
  return <form className="media-moderation-actions" action={`/api/admin/media/${mediaId}`} method="post">
    <input type="hidden" name="review_key" value={`profile:${profileId}`} />
    <input type="hidden" name="review_revision" value={revision} />
    <input type="hidden" name="return_to" value={returnTo} />
    <ActionButton className={`button ${approved ? "button-outline" : "button-primary"}`} type="submit" name="action" value={approved ? "unapprove" : "approve"}><ActionIcon name={approved ? "refresh" : "check"} />{approved ? "Devolver a revisión" : "Aprobar archivo"}</ActionButton>
  </form>;
}
