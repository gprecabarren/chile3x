import { ActionButton } from "@/app/ActionButton";
import Image from "next/image";
import { MediaVideo } from "@/app/MediaVideo";
import { profileMedia } from "@/db/schema";
import { formatMediaBytes } from "@/lib/media";
import { AdminMediaImageProcessing } from "./AdminMediaImageProcessing";
const moderationLabel = (status: string) => status === "approved" ? "Aprobado" : status === "pending" ? "En revisión" : "Rechazado";

export function PublicMediaCard({ media, profileName, returnTo, revision }: {
  media: typeof profileMedia.$inferSelect;
  revision: number;
  profileName: string;
  returnTo: string;
}) {
  return <article className={`admin-media-card is-${media.moderationStatus}`}>
    <div className="admin-media-preview">
      {media.mediaType === "image"
        ? <Image src={`/media/${media.id}`} alt={`Archivo enviado para ${profileName}`} fill unoptimized sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 300px" />
        : <MediaVideo src={`/media/${media.id}`} contentType={media.contentType} label={`Video de ${profileName}`} />}
    </div>
    <div>
      <span className={`media-status media-status-${media.moderationStatus}`}>{moderationLabel(media.moderationStatus)}</span>
      <p>{media.isProfilePhoto ? "Foto de perfil" : media.mediaType === "video" ? "Video de galería" : "Foto de galería"} · {formatMediaBytes(media.byteSize)}</p>
      <form action={`/api/admin/media/${media.id}`} method="post">
        <input type="hidden" name="review_key" value={`profile:${media.profileId}`} />
        <input type="hidden" name="review_revision" value={revision} />
        <input type="hidden" name="return_to" value={returnTo} />
        {media.moderationStatus === "approved"
          ? <ActionButton className="button button-outline" type="submit" name="action" value="unapprove">Cancelar aprobación</ActionButton>
          : <ActionButton className="button button-primary" type="submit" name="action" value="approve">Aprobar archivo</ActionButton>}
        <ActionButton className="button button-outline" type="submit" name="action" value="delete">Eliminar</ActionButton>
      </form>
      {media.mediaType === "image" && <AdminMediaImageProcessing mediaId={media.id} profileName={profileName} />}
    </div>
  </article>;
}

