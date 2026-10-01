// Ordered lists edited with "Fel" and "Le" buttons: the exam sheets' questions,
// the practical criteria, the fields of an equipment type.

/** Swaps an item with its neighbour above (-1) or below (1) in an ordered list. */
export async function swapWithNeighbour(
  items: { id: string; order: number }[],
  id: string,
  direction: -1 | 1,
  update: (id: string, order: number) => Promise<unknown>,
): Promise<boolean> {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((item) => item.id === id);
  const other = sorted[index + direction];
  if (index < 0 || !other) return false;
  await update(sorted[index].id, other.order);
  await update(other.id, sorted[index].order);
  return true;
}
