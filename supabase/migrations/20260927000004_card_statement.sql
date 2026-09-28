-- Saldo de una cuenta al cierre de un día, con las mismas reglas que account_balances().
create function public.account_balance_on(p_account_id uuid, p_date date)
returns numeric(14,2)
language sql stable security definer set search_path = '' as $$
  select (a.opening_balance + case when a.type = 'credit_card' then -1 else 1 end *
    coalesce((
      select sum(m.delta) from (
        select case t.type
          when 'income' then t.amount
          when 'loan_repayment' then t.amount
          when 'expense' then -t.amount
          when 'loan_out' then -t.amount
          when 'transfer' then -t.amount
          when 'goal_contribution' then -t.amount
          when 'goal_withdrawal' then -t.amount
        end as delta
        from public.transactions t
        where t.household_id = a.household_id and t.account_id = a.id
          and t.status = 'posted' and t.date <= p_date
        union all
        select t.amount
        from public.transactions t
        where t.household_id = a.household_id and t.destination_account_id = a.id
          and t.status = 'posted' and t.date <= p_date
      ) m
    ), 0))::numeric(14,2)
  from public.accounts a
  where a.id = p_account_id and a.household_id = public.current_household_id()
    and public.can_read_accounts()
$$;
revoke all on function public.account_balance_on(uuid, date) from public;
grant execute on function public.account_balance_on(uuid, date) to authenticated;
