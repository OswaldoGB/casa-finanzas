-- El saldo recuperado se mantiene junto al préstamo; el resumen no necesita releer el libro.
alter table public.loans add column recovered_amount numeric(14,2) not null default 0 check(recovered_amount>=0 and recovered_amount<=amount);
update public.loans l set recovered_amount=coalesce((
  select sum(tx.amount) from public.transactions tx
  where tx.loan_id=l.id and tx.type='loan_repayment' and tx.status='posted'
),0);
create or replace function public.sync_loan_status() returns trigger
language plpgsql security definer set search_path='' as $$
declare linked uuid; lent numeric; recovered numeric; begin
  linked:=case when TG_OP='DELETE' then old.loan_id else new.loan_id end;
  if linked is not null then
    select coalesce(sum(tx.amount) filter(where tx.type='loan_out'),0),coalesce(sum(tx.amount) filter(where tx.type='loan_repayment'),0)
      into lent,recovered from public.transactions tx where tx.loan_id=linked and tx.status='posted';
    update public.loans set recovered_amount=recovered,status=case when lent>0 and recovered>=lent then 'paid' else 'active' end
      where id=linked and status<>'written_off';
  end if;
  return null;
end $$;
create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'debtor',l.debtor,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'source_account_id',l.source_account_id,'source_account_name',a.name,'source_account_type',a.type,
    'already_recorded',l.already_recorded,'lent',l.amount,'recovered',l.recovered_amount,
    'pending',case when l.status='written_off' then 0 else l.amount-l.recovered_amount end,
    'overdue',l.status='active' and l.expected_payment_date<today and l.recovered_amount<l.amount) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join public.accounts a on a.id=l.source_account_id and a.household_id=l.household_id
    where l.household_id=public.current_household_id();
  return result;
end $$;
