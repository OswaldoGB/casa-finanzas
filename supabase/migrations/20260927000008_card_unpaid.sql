-- Los cargos posteriores al corte no forman parte del pago de ese estado.
-- Los abonos y reembolsos registrados después del corte reducen lo pendiente.
create function public.card_statement_unpaid(p_account_id uuid, p_close date, p_today date)
returns numeric(14,2) language sql stable security definer set search_path = '' as $$
  select greatest(0, public.account_balance_on(a.id, p_close) - coalesce((
    select sum(t.amount) from public.transactions t
    where t.household_id = a.household_id and t.status = 'posted'
      and t.date > p_close and t.date <= p_today
      and (t.destination_account_id = a.id
        or (t.account_id = a.id and t.type in ('income', 'loan_repayment')))
  ), 0))::numeric(14,2)
  from public.accounts a
  where a.id = p_account_id and a.type = 'credit_card'
    and a.household_id = public.current_household_id() and public.can_read_accounts()
$$;
revoke all on function public.card_statement_unpaid(uuid, date, date) from public;
grant execute on function public.card_statement_unpaid(uuid, date, date) to authenticated;
