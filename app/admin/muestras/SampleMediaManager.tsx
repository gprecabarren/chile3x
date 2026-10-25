"use client";

import { ProfileMediaManager } from "@/app/mi-cuenta/ProfileMediaManager";

type SampleFile = {
  id: string;
  contentType: string;
  mediaType: "image" | "video";
  isProfilePhoto: boolean;
  byteSize: number;
};
type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };

/** Samples use the listing editor itself, including all local preparation and
 * previews. Only the authenticated endpoint, revision key and copy differ. */
export function SampleMediaManager({ id, revision, files, initialQuota }: {
  id: string;
  revision: number;
  files: SampleFile[];
  initialQuota: Quota;
}) {
  return <ProfileMediaManager key={id} profileId={id} initialRevision={revision} adminMode sampleMode
    mediaSettings={{ watermarkEnabled: false, faceBlurEnabled: true }} initialQuota={initialQuota}
    initialMedia={files.map(file => ({ ...file, url: `/muestra/${id}/archivo/${file.id}`, moderationStatus: "approved", visibility: "public" }))} />;
}
