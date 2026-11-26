create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'direction',l.direction,'debtor',l.debtor,'person_id',l.person_id,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'source_account_id',l.source_account_id,'source_account_name',a.name,'source_account_type',a.type,
    'already_recorded',l.already_recorded,
    'has_purchase_items',case when p_module='loans' then exists (
      select 1 from public.loan_purchase_items i where i.loan_id=l.id
    ) else false end,'lent',l.amount,'recovered',l.recovered_amount,
    'pending',case when l.status='written_off' then 0 else l.amount-l.recovered_amount end,
    'overdue',coalesce(l.status='active' and l.expected_payment_date<today and l.recovered_amount<l.amount,false)) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join public.accounts a on a.id=l.source_account_id and a.household_id=l.household_id
    where l.household_id=public.current_household_id();
  return result;
end $$;
