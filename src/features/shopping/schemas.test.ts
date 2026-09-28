import { it, expect } from "vitest";
import { shoppingSchema } from "./schemas";
it("rechaza enlaces ejecutables y conserva precio desconocido", () => {
  const item = {
    name: "Silla",
    estimated_price: "",
    priority: "high",
    target_date: "",
    url: "javascript:alert(1)",
    notes: "",
    status: "pending",
  };
  expect(shoppingSchema.safeParse(item).success).toBe(false);
  const parsed = shoppingSchema.parse({ ...item, url: "https://example.com" });
  expect(parsed.estimated_price).toBeNull();
});
