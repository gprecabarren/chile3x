export const MAX_DIRECTORY_ORDER_SEED = 1_000_000;

export function readDirectoryOrderSeed(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^[1-9]\d{0,6}$/.test(raw) && Number(raw) <= MAX_DIRECTORY_ORDER_SEED) return Number(raw);
  return crypto.getRandomValues(new Uint32Array(1))[0] % MAX_DIRECTORY_ORDER_SEED + 1;
}

/** Same bounded integer arithmetic as D1; a seed lives for one pagination chain. */
export function directoryOrderScore(id: string, seed: number) {
  let suffix = 0;
  for (const character of id.slice(-8).toLowerCase()) suffix = (suffix * 131 + (character.codePointAt(0) ?? 0)) % 2_147_483_647;
  return (suffix * seed) % 2_147_483_647;
}
