-- El tipo cambia la interpretación de todo el historial de la cuenta.
-- Archivar una cuenta detiene también sus cargos recurrentes.
create function public.guard_account_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.type is distinct from old.type then
    raise exception 'El tipo de una cuenta no se puede cambiar';
  end if;
  if new.is_archived and not old.is_archived then
    update public.recurring_rules r set is_active = false
    where r.household_id = old.household_id and r.is_active
      and (r.account_id = old.id or r.destination_account_id = old.id);
  end if;
  return new;
end $$;
revoke all on function public.guard_account_update() from public;
create trigger accounts_guard before update on public.accounts
  for each row execute function public.guard_account_update();

-- Bloquear la categoría mientras se escribe un movimiento evita una carrera
-- con la edición simultánea del tipo de esa categoría.
create or replace function public.validate_finance_category() returns trigger
language plpgsql set search_path = '' as $$
declare category_kind public.category_type;
declare parent_kind public.category_type;
declare parent_parent uuid;
begin
  if TG_TABLE_NAME = 'categories' then
    if new.parent_id is not null then
      select c.type, c.parent_id into parent_kind, parent_parent
      from public.categories c where c.id = new.parent_id and c.household_id = new.household_id;
      if parent_kind is distinct from new.type or parent_parent is not null then
        raise exception 'La subcategoría debe compartir tipo y tener solo un nivel';
      end if;
      if exists (select 1 from public.categories c where c.parent_id = new.id) then
        raise exception 'Una categoría con subcategorías no puede pasar a ser subcategoría';
      end if;
    end if;
    if TG_OP = 'UPDATE' and old.type is distinct from new.type and
      (exists (select 1 from public.categories c where c.parent_id = new.id)
        or exists (select 1 from public.transactions t where t.category_id = new.id)
        or exists (select 1 from public.recurring_rules r where r.category_id = new.id)) then
      raise exception 'No se puede cambiar el tipo de una categoría en uso';
    end if;
  elsif new.category_id is not null then
    select c.type into category_kind from public.categories c
      where c.id = new.category_id and c.household_id = new.household_id
      for share;
    if (new.type = 'income' and category_kind is distinct from 'income')
      or (new.type = 'expense' and category_kind is distinct from 'expense')
      or new.type not in ('income', 'expense') then
      raise exception 'La categoría no corresponde al tipo de movimiento';
    end if;
  end if;
  return new;
end $$;
