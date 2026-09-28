-- Agregar movimientos por préstamo antes de unirlos evita referencias cruzadas en el resumen.
create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  with totals as (
    select tx.loan_id,sum(tx.amount) filter(where tx.type='loan_out') as lent,
      sum(tx.amount) filter(where tx.type='loan_repayment') as recovered
    from public.transactions tx where tx.status='posted' and tx.date<=today group by tx.loan_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'debtor',l.debtor,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'source_account_id',l.source_account_id,'source_account_name',a.name,'source_account_type',a.type,
    'already_recorded',l.already_recorded,'lent',coalesce(t.lent,0),'recovered',coalesce(t.recovered,0),
    'pending',case when l.status='written_off' then 0 else greatest(coalesce(t.lent,0)-coalesce(t.recovered,0),0) end,
    'overdue',coalesce(l.status='active' and l.expected_payment_date<today and coalesce(t.lent,0)>coalesce(t.recovered,0),false)) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join public.accounts a on a.id=l.source_account_id and a.household_id=l.household_id
    left join totals t on t.loan_id=l.id where l.household_id=public.current_household_id();
  return result;
end $$;
