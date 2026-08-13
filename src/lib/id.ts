// Timestamp-based ids (`t-${Date.now()}`) collide when two staff act on the
// same order within the same millisecond — realistic here since orders sync
// live across devices (see App.tsx's `orders-realtime` channel). `crypto.
// randomUUID()` is native in every browser this app targets, so there's no
// reason to keep the collision risk.
export function genId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
