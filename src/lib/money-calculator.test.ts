import { expect, it } from "vitest";
import { calculateMoney } from "./money-calculator";

it.each([
  ["12 + 3 * 4", "24.00"],
  ["(12 + 3) × 4", "60.00"],
  ["250 * 15%", "37.50"],
  ["10,25 + 2,75", "13.00"],
  ["1.005", "1.01"],
  ["0.1 + 0.2", "0.30"],
  ["100 ÷ 3", "33.33"],
  ["-5 + 2", "-3.00"],
])("calculates %s in cents", (expression, result) => {
  expect(calculateMoney(expression)).toBe(result);
});

it.each(["", "1 / 0", "1 +", "(2 + 3", "2 3", "alert(1)", "1e309", "2 ** 3"])(
  "rejects invalid expression %s",
  (expression) => {
    expect(() => calculateMoney(expression)).toThrow();
  },
);
