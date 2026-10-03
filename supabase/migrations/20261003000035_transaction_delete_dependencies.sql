-- Al borrar el gasto con el que se cerró una lista, restaurar la lista para
-- que pueda corregirse y cerrarse nuevamente con un movimiento distinto.
create or replace function public.guard_home_purchase() returns trigger
language plpgsql set search_path='' as $$
begin
  if TG_OP='UPDATE' and old.transaction_id is not null
    and new.transaction_id is null and new.status='open' then
    if not public.has_module_access('transactions','edit') then
      raise exception 'No tienes permiso para desvincular un gasto';
    end if;
    return new;
  end if;
  if TG_OP='UPDATE' and old.transaction_id is not null then
    if new.transaction_id is distinct from old.transaction_id then
      raise exception 'No se puede cambiar el gasto vinculado';
    end if;
    if (TG_TABLE_NAME='shopping_lists' and new.status='open')
      or (TG_TABLE_NAME='shopping_items' and new.status='pending') then
      raise exception 'Una compra registrada no puede reabrirse';
    end if;
  end if;
  if (TG_TABLE_NAME='shopping_lists' and new.status='completed')
    or (TG_TABLE_NAME='shopping_items' and new.status='bought') then
    if new.transaction_id is null then
      raise exception 'Registra el gasto para completar la compra';
    end if;
  end if;
  if new.transaction_id is not null
    and (TG_OP='INSERT' or new.transaction_id is distinct from old.transaction_id)
    and not public.has_module_access('transactions','edit') then
    raise exception 'No tienes permiso para vincular un gasto';
  end if;
  if new.transaction_id is not null
    and (TG_OP='INSERT' or new.transaction_id is distinct from old.transaction_id)
    and not exists(
      select 1 from public.transactions t
      where t.id=new.transaction_id and t.household_id=new.household_id
        and t.type='expense' and t.status='posted'
    ) then
    raise exception 'El movimiento vinculado debe ser un gasto confirmado';
  end if;
  return new;
end $$;

create function public.delete_transaction_with_dependencies(p_transaction_id uuid)
returns void
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id();
begin
  if h is null or not public.has_module_access('transactions','edit') then
    raise exception 'Sin permiso para borrar movimientos';
  end if;
  if p_transaction_id is null then
    raise exception 'Movimiento inválido';
  end if;
  perform 1 from public.transactions
    where id=p_transaction_id and household_id=h for update;
  if not found then
    raise exception 'Movimiento no encontrado';
  end if;
  perform public.assert_transactions_unfinanced(array[p_transaction_id]);
  update public.shopping_lists
    set status='open', transaction_id=null
    where household_id=h and transaction_id=p_transaction_id;
  delete from public.transactions
    where id=p_transaction_id and household_id=h;
  if not found then
    raise exception 'No se pudo borrar el movimiento';
  end if;
end $$;

revoke all on function public.delete_transaction_with_dependencies(uuid) from public;
grant execute on function public.delete_transaction_with_dependencies(uuid) to authenticated;
