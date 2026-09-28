-- Los DELETE no siempre incluyen columnas para filtros de Realtime bajo RLS.
-- Actualizar el padre permite refrescar ambos dispositivos por el id de lista.
create function public.touch_shopping_list() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'DELETE' then
    update public.shopping_lists set updated_at = now() where id = old.list_id and household_id = old.household_id;
    return old;
  end if;
  update public.shopping_lists set updated_at = now() where id = new.list_id and household_id = new.household_id;
  return new;
end $$;
revoke all on function public.touch_shopping_list() from public;
create trigger shopping_items_touch_list after insert or update or delete on public.shopping_list_items
  for each row execute function public.touch_shopping_list();
