export async function scanR2Storage(bucket: Pick<R2Bucket, "list">, referencedKeys: Set<string>, maximumObjects = 20_000) {
  const foundReferencedKeys = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let objectCount = 0;
  let r2Bytes = 0;
  let orphanObjectCount = 0;
  let orphanBytes = 0;
  let partial = false;

  while (objectCount < maximumObjects) {
    const page = await bucket.list({ limit: Math.min(1000, maximumObjects - objectCount), cursor, include: [] });
    for (const object of page.objects) {
      objectCount += 1;
      r2Bytes += object.size;
      if (referencedKeys.has(object.key)) foundReferencedKeys.add(object.key);
      else {
        orphanObjectCount += 1;
        orphanBytes += object.size;
      }
    }
    if (!page.truncated) break;
    if (!page.cursor || seenCursors.has(page.cursor) || objectCount >= maximumObjects) {
      partial = true;
      break;
    }
    seenCursors.add(page.cursor);
    cursor = page.cursor;
  }

  return {
    status: partial ? "partial" as const : "complete" as const,
    objectCount,
    r2Bytes,
    orphanObjectCount,
    orphanBytes,
    missingObjectCount: partial ? null : [...referencedKeys].filter((key) => !foundReferencedKeys.has(key)).length,
  };
}
