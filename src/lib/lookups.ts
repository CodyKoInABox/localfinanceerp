export function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

export function labelOf(
  items: { id: string; name: string }[],
  id: string | null | undefined,
  fallback = "—"
): string {
  if (!id) {
    return fallback
  }
  return items.find((item) => item.id === id)?.name ?? fallback
}
