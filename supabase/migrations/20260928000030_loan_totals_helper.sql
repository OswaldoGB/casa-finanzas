-- Aislar los totales del libro evita que el resumen comparta nombres con sus uniones.
create function public.loan_totals(p_loan_id uuid,p_today date)
returns table(lent numeric,recovered numeric) language sql stable security definer set search_path='' as $$
  select coalesce(sum(m.amount) filter(where m.type='loan_out'),0),
    coalesce(sum(m.amount) filter(where m.type='loan_repayment'),0)
  from public.transactions m where m.loan_id=p_loan_id and m.status='posted' and m.date<=p_today
$$;
create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'debtor',l.debtor,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'source_account_id',l.source_account_id,'source_account_name',a.name,'source_account_type',a.type,
    'already_recorded',l.already_recorded,'lent',t.lent,'recovered',t.recovered,
    'pending',case when l.status='written_off' then 0 else greatest(t.lent-t.recovered,0) end,
    'overdue',coalesce(l.status='active' and l.expected_payment_date<today and t.lent>t.recovered,false)) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join public.accounts a on a.id=l.source_account_id and a.household_id=l.household_id
    cross join lateral public.loan_totals(l.id,today) t where l.household_id=public.current_household_id();
  return result;
end $$;
revoke all on function public.loan_totals(uuid,date) from public;
