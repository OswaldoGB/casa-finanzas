-- Antes de tocar Storage, verificar que ningún gasto esté vinculado a cuotas.
create function public.assert_transactions_unfinanced(p_ids uuid[]) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_module_access('transactions','edit') then
    raise exception 'Sin permiso' using errcode='42501'; end if;
  if p_ids is null or cardinality(p_ids) not between 1 and 100 then raise exception 'Selección inválida'; end if;
  if exists(select 1 from public.card_installment_plans where household_id=public.current_household_id() and transaction_id=any(p_ids)) then
    raise exception 'Quita primero la financiación de la compra antes de borrar su movimiento'; end if;
end $$;
revoke all on function public.assert_transactions_unfinanced(uuid[]) from public;
grant execute on function public.assert_transactions_unfinanced(uuid[]) to authenticated;
