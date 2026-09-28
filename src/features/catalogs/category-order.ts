export type OrderedCategory = {
  id: string;
  type: "income" | "expense";
  parent_id: string | null;
  sort_order: number;
  name: string;
};

function orderedSiblings(
  categories: readonly OrderedCategory[],
  selected: OrderedCategory,
) {
  return categories
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
}

export function dropCategoryWithinSiblings(
  categories: readonly OrderedCategory[],
  id: string,
  targetId: string,
): string[] | null {
  const selected = categories.find((category) => category.id === id);
  const target = categories.find((category) => category.id === targetId);
  if (
    !selected ||
    !target ||
    id === targetId ||
    selected.type !== target.type ||
    selected.parent_id !== target.parent_id
  )
    return null;
  const siblings = orderedSiblings(categories, selected);
  const targetIndex = siblings.indexOf(targetId);
  siblings.splice(siblings.indexOf(id), 1);
  siblings.splice(targetIndex, 0, id);
  return siblings;
}

export function moveCategoryWithinSiblings(
  categories: readonly OrderedCategory[],
  id: string,
  direction: "up" | "down",
): string[] | null {
  const selected = categories.find((category) => category.id === id);
  if (!selected) return null;
  const siblings = orderedSiblings(categories, selected);
  const index = siblings.indexOf(id);
  const neighbor = index + (direction === "up" ? -1 : 1);
  if (neighbor < 0 || neighbor >= siblings.length) return null;
  [siblings[index], siblings[neighbor]] = [siblings[neighbor], siblings[index]];
  return siblings;
}
