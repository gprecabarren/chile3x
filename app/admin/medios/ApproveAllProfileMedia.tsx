import { MAX_BULK_MEDIA, mediaReviewSnapshot, type ReviewableMedia } from "@/lib/media-bulk-review";

export async function ApproveAllProfileMedia({ profileId, files, returnTo }: {
  profileId: string; files: readonly ReviewableMedia[]; returnTo: string;
}) {
  const publicFiles = files.filter(file => file.visibility === "public");
  if (!publicFiles.length) return null;
  if (publicFiles.length > MAX_BULK_MEDIA) return <p>Esta galería requiere revisión individual por su cantidad de archivos.</p>;
  const count = publicFiles.filter(file => file.moderationStatus !== "approved").length;
  if (!count) return <p className="bulk-media-complete">✓ Todos los archivos mostrados ya están aprobados.</p>;
  const snapshot = await mediaReviewSnapshot(publicFiles);
  return <form className="bulk-media-approval" action={`/api/admin/profiles/${profileId}/media/aprobar-todos`} method="post">
    <input type="hidden" name="return_to" value={returnTo} />
    <input type="hidden" name="reviewed_media" value={JSON.stringify(snapshot)} />
    <div><label><input type="checkbox" name="review_confirmed" value="yes" required />Revisé todas las fotos y videos mostrados de este anuncio.</label><small>Aprueba {count} archivo{count === 1 ? "" : "s"}. No publica el anuncio ni aprueba documentos privados o contenido exclusivo.</small></div>
    <button className="button button-primary" type="submit">Aprobar todos los archivos</button>
  </form>;
}
