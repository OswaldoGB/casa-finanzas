import { describe, expect, it } from "vitest";
import { bulkSelectionSchema, canRecategorize } from "./bulk";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

describe("bulk movement validation", () => {
  it("rejects empty, duplicate and malformed selections", () => {
    expect(bulkSelectionSchema.safeParse([]).success).toBe(false);
    expect(bulkSelectionSchema.safeParse([first, first]).success).toBe(false);
    expect(bulkSelectionSchema.safeParse([first, "not-a-uuid"]).success).toBe(
      false,
    );
    expect(bulkSelectionSchema.safeParse([first, second]).success).toBe(true);
  });
  it("allows recategorizing posted movements only when their types match the category", () => {
    expect(
      canRecategorize(
        [
          { type: "expense", status: "posted" },
          { type: "expense", status: "posted" },
        ],
        "expense",
      ),
    ).toBe(true);
    expect(
      canRecategorize(
        [
          { type: "expense", status: "posted" },
          { type: "income", status: "posted" },
        ],
        "expense",
      ),
    ).toBe(false);
    expect(
      canRecategorize([{ type: "expense", status: "pending" }], "expense"),
    ).toBe(false);
    expect(
      canRecategorize([{ type: "transfer", status: "posted" }], "expense"),
    ).toBe(false);
  });
});
