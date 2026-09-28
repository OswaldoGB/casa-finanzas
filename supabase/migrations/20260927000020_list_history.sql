alter table public.shopping_lists add column completed_at timestamptz;
update public.shopping_lists l set completed_at=t.created_at from public.transactions t where l.transaction_id=t.id;
create or replace function public.close_shopping_list(p_list_id uuid,p_account_id uuid,p_category_id uuid,p_payment_method_id uuid default null,p_carry_unchecked boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.shopping_lists; total numeric(14,2); tx uuid; next_list uuid; today date;
begin
  if not public.has_module_access('shopping_lists','edit') or not public.has_module_access('transactions','edit') then raise exception 'No tienes permiso para cerrar la compra'; end if;
  select * into l from public.shopping_lists where id=p_list_id and household_id=public.current_household_id() for update;
  if not found or l.status<>'open' then raise exception 'La lista no existe o ya está cerrada'; end if;
  perform public.validate_purchase_refs(l.household_id,p_account_id,p_category_id,p_payment_method_id);
  if exists(select 1 from public.shopping_list_items where list_id=l.id and checked and real_price is null) then raise exception 'Completa los precios reales del carrito'; end if;
  select round(sum(real_price*quantity),2) into total from public.shopping_list_items where list_id=l.id and checked;
  if total is null or total<=0 then raise exception 'El carrito debe tener un total mayor que cero'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=l.household_id;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,category_id,payment_method_id,description) values(l.household_id,auth.uid(),'expense',total,today,p_account_id,p_category_id,p_payment_method_id,left(l.name || case when l.store<>'' then ' · ' || l.store else '' end,240)) returning id into tx;
  if p_carry_unchecked and exists(select 1 from public.shopping_list_items where list_id=l.id and not checked) then
    insert into public.shopping_lists(household_id,created_by,name,store,budget) values(l.household_id,auth.uid(),left(l.name || ' · pendientes',100),l.store,l.budget) returning id into next_list;
    insert into public.shopping_list_items(household_id,created_by,list_id,name,quantity,unit,estimated_price,sort_order,notes) select household_id,auth.uid(),next_list,name,quantity,unit,coalesce(estimated_price,real_price),sort_order,notes from public.shopping_list_items where list_id=l.id and not checked;
  end if;
  update public.shopping_lists set status='completed',transaction_id=tx,completed_at=now() where id=l.id;
  return jsonb_build_object('transaction_id',tx,'new_list_id',next_list);
end $$;
revoke all on function public.close_shopping_list(uuid,uuid,uuid,uuid,boolean) from public;
grant execute on function public.close_shopping_list(uuid,uuid,uuid,uuid,boolean) to authenticated;


