type Operator = "+" | "-" | "*" | "/";

export type CalculatorKey = Operator | `${number}` | "." | "=" | "clear" | "delete" | "sign";

type CalculatorState = {
  entry: string;
  left: number;
  operator: Operator | null;
  replaceEntry: boolean;
};

export const initialCalculator: CalculatorState = {
  entry: "0",
  left: 0,
  operator: null,
  replaceEntry: true,
};

function calculate(left: number, operator: Operator, right: number) {
  switch (operator) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/": return left / right;
  }
}

export function pressCalculatorKey(state: CalculatorState, key: CalculatorKey): CalculatorState {
  if (key === "clear") return initialCalculator;

  if (state.entry === "Error") state = initialCalculator;
  const { entry, left, operator, replaceEntry } = state;

  switch (key) {
    case "+":
    case "-":
    case "*":
    case "/":
    case "=": {
      if (key === "=" && (!operator || replaceEntry)) return state;

      const result = operator && !replaceEntry
        ? calculate(left, operator, Number(entry))
        : Number(entry);
      if (!Number.isFinite(result)) return { ...initialCalculator, entry: "Error" };

      const rounded = Number(result.toPrecision(15));
      return {
        entry: String(rounded),
        left: rounded,
        operator: key === "=" ? null : key,
        replaceEntry: true,
      };
    }
    case "delete": {
      if (replaceEntry) return state;
      const shortened = entry.slice(0, -1);
      return { ...state, entry: shortened === "-" || !shortened ? "0" : shortened };
    }
    case "sign": {
      const value = replaceEntry && operator ? "0" : entry;
      return {
        ...state,
        entry: value.startsWith("-") ? value.slice(1) : `-${value}`,
        replaceEntry: !operator && replaceEntry && value !== "0",
      };
    }
    default: {
      const value = replaceEntry ? "0" : entry;
      if (key === ".") {
        if (value.includes(".")) return state;
      } else if (value.replace(/[^0-9]/g, "").length >= 15) {
        return state;
      }
      const prefix = key !== "." && (value === "0" || value === "-0")
        ? value.slice(0, -1)
        : value;
      return { ...state, entry: prefix + key, replaceEntry: false };
    }
  }
}
