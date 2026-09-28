export type OrderedCategory = {
  id: string;
  type: "income" | "expense";
  parent_id: string | null;
  sort_order: number;
  name: string;
};

export function moveCategoryWithinSiblings(
  categories: readonly OrderedCategory[],
  id: string,
  direction: "up" | "down",
): string[] | null {
  const selected = categories.find((category) => category.id === id);
  if (!selected) return null;
  const siblings = categories
    .filter(
      (category) =>
        category.type === selected.type &&
        category.parent_id === selected.parent_id,
    )
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    )
    .map((category) => category.id);
  const index = siblings.indexOf(id);
  const neighbor = index + (direction === "up" ? -1 : 1);
  if (neighbor < 0 || neighbor >= siblings.length) return null;
  [siblings[index], siblings[neighbor]] = [siblings[neighbor], siblings[index]];
  return siblings;
}
