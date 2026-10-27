export function photoDeletionPlan(media: Array<{id:string;mediaType:string;visibility:string;replacementOf?:string}>) {
  const photos = media.filter(item => item.mediaType === "image" && item.visibility === "public");
  return { count: photos.length, ids: [...new Set(photos.flatMap(item => [item.id, ...(item.replacementOf ? [item.replacementOf] : [])]))] };
}

/** Keep each request's authorization, revision and audit handling. A failed or
 * uncertain response stops the batch; never retry a destructive write here. */
export async function deletePhotosSequentially(ids: string[], remove: (id: string) => Promise<void>) {
  const deleted: string[] = [];
  for (const id of ids) {
    try { await remove(id); deleted.push(id); }
    catch (error) { return { deleted, failedId: id, error }; }
  }
  return { deleted, failedId: null, error: undefined };
}
