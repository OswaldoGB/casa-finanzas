create function public.loan_delete(p_loan_id uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  h uuid := public.current_household_id();
  receipts text[];
begin
  if h is null or not (public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then
    raise exception 'Sin permiso para eliminar préstamos';
  end if;
  perform 1 from public.loans where id = p_loan_id and household_id = h for update;
  if not found then raise exception 'Préstamo no disponible'; end if;

  if exists (
    select 1 from public.card_installment_plans p
    join public.transactions t on t.id = p.transaction_id and t.household_id = p.household_id
    where t.loan_id = p_loan_id and t.household_id = h
  ) then
    raise exception 'Quita primero la financiación del movimiento vinculado';
  end if;

  select coalesce(array_agg(a.storage_path), '{}') into receipts
  from public.attachments a
  join public.transactions t on t.id = a.transaction_id and t.household_id = a.household_id
  where t.loan_id = p_loan_id and t.household_id = h
    and starts_with(a.storage_path, h::text || '/' || t.id::text || '/');

  -- Remove allocations before the synthetic origin and repayments before the
  -- original loan movement so the ledger never has excess payments.
  delete from public.loan_purchase_items where loan_id = p_loan_id;
  delete from public.transactions where loan_id = p_loan_id and household_id = h and type = 'loan_repayment';
  delete from public.transactions where loan_id = p_loan_id and household_id = h;
  delete from public.recurring_rules where loan_id = p_loan_id and household_id = h;
  delete from public.loans where id = p_loan_id and household_id = h;
  return receipts;
end $$;

revoke all on function public.loan_delete(uuid) from public, anon;
grant execute on function public.loan_delete(uuid) to authenticated;
