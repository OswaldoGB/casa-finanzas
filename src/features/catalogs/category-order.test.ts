import { describe, expect, it } from "vitest";
import {
  moveCategoryWithinSiblings,
  type OrderedCategory,
} from "./category-order";

const categories: OrderedCategory[] = [
  { id: "a", type: "expense", parent_id: null, sort_order: 0, name: "A" },
  { id: "b", type: "expense", parent_id: null, sort_order: 0, name: "B" },
  { id: "c", type: "income", parent_id: null, sort_order: 0, name: "C" },
  { id: "d", type: "expense", parent_id: "a", sort_order: 0, name: "D" },
];

describe("moveCategoryWithinSiblings", () => {
  it("moves only within the same type and parent", () => {
    expect(moveCategoryWithinSiblings(categories, "a", "down")).toEqual([
      "b",
      "a",
    ]);
    expect(moveCategoryWithinSiblings(categories, "d", "up")).toBeNull();
  });

  it("leaves the ends unchanged and handles equal initial ranks", () => {
    expect(moveCategoryWithinSiblings(categories, "a", "up")).toBeNull();
    expect(moveCategoryWithinSiblings(categories, "b", "down")).toBeNull();
    expect(moveCategoryWithinSiblings(categories, "b", "up")).toEqual([
      "b",
      "a",
    ]);
  });
});
