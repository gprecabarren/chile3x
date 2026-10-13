import { exclusiveContentMedia } from "@/db/schema";
import { MAX_EXCLUSIVE_BULK_MEDIA, mediaReviewSnapshot } from "@/lib/media-bulk-review";

export async function ApproveAllExclusiveMedia({ collectionId, files, returnTo }: {
  collectionId: string; files: readonly (typeof exclusiveContentMedia.$inferSelect)[]; returnTo: string;
}) {
  if (!files.length) return null;
  if (files.length > MAX_EXCLUSIVE_BULK_MEDIA) return <p>Esta biblioteca requiere revisión individual.</p>;
  const count = files.filter(file => file.moderationStatus !== "approved").length;
  if (!count) return <p className="bulk-media-complete">✓ Todos los archivos exclusivos mostrados ya están aprobados.</p>;
  const snapshot = await mediaReviewSnapshot(files.map(file => ({ ...file, isProfilePhoto: false, visibility: "exclusive" })));
  return <form className="bulk-media-approval" action={`/api/admin/contenido/colecciones/${collectionId}/aprobar-todos`} method="post">
    <input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="reviewed_media" value={JSON.stringify(snapshot)} />
    <div><label><input type="checkbox" name="review_confirmed" value="yes" required />Revisé todas las fotos y videos exclusivos mostrados de esta cuenta.</label><small>Aprueba {count} archivo{count === 1 ? "" : "s"}. No publica este contenido ni concede acceso a otras cuentas.</small></div>
    <button className="button button-primary" type="submit">Aprobar todos los archivos exclusivos</button>
  </form>;
}
