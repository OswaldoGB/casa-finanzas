// Método de pago que corresponde a una cuenta: primero el ligado a esa cuenta,
// si no, el primero del tipo que le toca (tarjeta → crédito, banco → transferencia).
export type AccountRef = { id: string; type?: string | null };
export type MethodRef = {
  id: string;
  type?: string | null;
  account_id?: string | null;
  is_archived?: boolean;
};

const TYPE_FOR_ACCOUNT: Record<string, string> = {
  credit_card: "credit",
  checking: "transfer",
  savings: "transfer",
  cash: "cash",
};

export function methodForAccount(
  account: AccountRef | undefined,
  methods: MethodRef[],
): string | null {
  if (!account) return null;
  const usable = methods.filter((m) => !m.is_archived);
  const linked = usable.find((m) => m.account_id === account.id);
  if (linked) return linked.id;
  const type = account.type ? TYPE_FOR_ACCOUNT[account.type] : undefined;
  return (type && usable.find((m) => m.type === type)?.id) || null;
}

/** Para formularios con <select> nativo: al cambiar la cuenta, fija el método en el mismo form. */
export function syncMethodSelect(
  accountSelect: HTMLSelectElement,
  accounts: AccountRef[],
  methods: MethodRef[],
  methodField = "payment_method_id",
) {
  const method = methodForAccount(
    accounts.find((a) => a.id === accountSelect.value),
    methods,
  );
  const target = accountSelect.form?.elements.namedItem(methodField);
  if (method && target instanceof HTMLSelectElement) target.value = method;
}
