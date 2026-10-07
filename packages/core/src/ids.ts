let sequence = 0;

/**
 * A fresh block id such as `button-k3x9q21`. Unique enough within a document, which is all
 * `validateDocument` asks of it; the type prefix makes ids readable in logs and test output.
 */
export function newBlockId(type: string): string {
  sequence = (sequence + 1) % 1_000_000;
  const random = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
  return `${type}-${random}${sequence.toString(36)}`;
}
