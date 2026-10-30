import { ApproveAllProfileMedia } from "./ApproveAllProfileMedia";
import { MediaModerationActions } from "./MediaModerationActions";
import type { ProfileMediaRecord } from "@/lib/media";

export function profileModerationControls(profileId: string, revision: number, files: readonly ProfileMediaRecord[], returnTo: string) {
  const publicFiles = files.filter(file => file.visibility === "public");
  return {
    moderationBulk: <ApproveAllProfileMedia profileId={profileId} revision={revision} files={publicFiles} returnTo={returnTo} />,
    moderationActions: Object.fromEntries(publicFiles.map(file => [file.id, <MediaModerationActions key={file.id} profileId={profileId} mediaId={file.id} status={file.moderationStatus} revision={revision} returnTo={returnTo} />])),
  };
}
