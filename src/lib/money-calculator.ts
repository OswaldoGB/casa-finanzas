/** Arithmetic only: percentages are fractions (250 × 15% = 37.50). */
export function calculateMoney(expression: string): string {
  const source = expression
    .replace(/,/g, ".")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  if (!source.trim() || source.length > 200)
    throw new Error("Escribe una operación.");
  let position = 0;
  const skip = () => {
    while (/\s/.test(source[position] ?? "") && position < source.length)
      position++;
  };
  function primary(): number {
    skip();
    let value: number;
    const token = source[position];
    if (token === "+" || token === "-") {
      position++;
      return (token === "-" ? -1 : 1) * primary();
    }
    if (token === "(") {
      position++;
      value = sum();
      skip();
      if (source[position++] !== ")") throw new Error("Revisa los paréntesis.");
    } else {
      const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new Error("Completa la operación.");
      position += match[0].length;
      value = Number(match[0]);
    }
    skip();
    if (source[position] === "%") {
      position++;
      value /= 100;
    }
    return value;
  }
  function product(): number {
    let value = primary();
    skip();
    while (source[position] === "*" || source[position] === "/") {
      const operation = source[position++];
      const right = primary();
      if (operation === "/" && right === 0)
        throw new Error("No se puede dividir entre cero.");
      value = operation === "*" ? value * right : value / right;
      skip();
    }
    return value;
  }
  function sum(): number {
    let value = product();
    skip();
    while (source[position] === "+" || source[position] === "-") {
      const operation = source[position++];
      const right = product();
      value = operation === "+" ? value + right : value - right;
      skip();
    }
    return value;
  }
  const value = sum();
  skip();
  if (position !== source.length || !Number.isFinite(value))
    throw new Error("Revisa la operación.");
  if (Math.abs(value) > 999999999999.99)
    throw new Error("El resultado es demasiado grande.");
  const rounded =
    (Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100)) /
    100;
  return (rounded === 0 ? 0 : rounded).toFixed(2);
}
