import { describe, expect, it } from "vitest";
import { formatUSD, splitUSD } from "./format";

describe("formatUSD", () => {
  it("formatea con separadores y 2 decimales", () => {
    expect(formatUSD(1234.5)).toBe("$1,234.50");
    expect(formatUSD(0)).toBe("$0.00");
  });
  it("redondea a centavos", () => {
    expect(formatUSD(0.125)).toBe("$0.13");
  });
  it("muestra negativos con signo", () => {
    expect(formatUSD(-42)).toBe("-$42.00");
  });
});

describe("splitUSD", () => {
  it("separa entero y centavos", () => {
    expect(splitUSD(1234.56)).toEqual({ whole: "$1,234", cents: ".56" });
    expect(splitUSD(-7.05)).toEqual({ whole: "-$7", cents: ".05" });
  });
});
