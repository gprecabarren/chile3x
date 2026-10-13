export type MediaByteRange = { offset: number; length: number };

/** Single byte ranges cover browser video seeks; ignore unsupported/multiple ranges. */
export function mediaByteRange(header: string | null, size: number): MediaByteRange | "unsatisfiable" | null {
  if (!header || header.length > 200 || !Number.isSafeInteger(size) || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return "unsatisfiable";
    const length = Math.min(size, suffix);
    return { offset: size - length, length };
  }
  const offset = Number(match[1]), end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset >= size || end < offset) return "unsatisfiable";
  return { offset, length: end - offset + 1 };
}
