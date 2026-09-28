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
  update public.shopping_lists set status='completed',transaction_id=tx where id=l.id;
  return jsonb_build_object('transaction_id',tx,'new_list_id',next_list);
end $$;
revoke all on function public.close_shopping_list(uuid,uuid,uuid,uuid,boolean) from public;
grant execute on function public.close_shopping_list(uuid,uuid,uuid,uuid,boolean) to authenticated;

create or replace function public.shopping_buy(p_item_id uuid,p_amount numeric,p_account_id uuid,p_category_id uuid,p_payment_method_id uuid default null,p_create_inventory boolean default false,p_date date default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.shopping_items; tx uuid; inv uuid; bought_date date;
begin
  if not public.has_module_access('shopping','edit') or not public.has_module_access('transactions','edit') or (p_create_inventory and not public.has_module_access('inventory','edit')) then raise exception 'No tienes permiso para registrar esta compra'; end if;
  select * into item from public.shopping_items where id=p_item_id and household_id=public.current_household_id() for update;
  if not found or item.status<>'pending' then raise exception 'La compra no existe o ya fue procesada'; end if;
  if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then raise exception 'El precio debe ser mayor que cero y tener hasta dos decimales'; end if;
  perform public.validate_purchase_refs(item.household_id,p_account_id,p_category_id,p_payment_method_id);
  select coalesce(p_date,(now() at time zone timezone)::date) into bought_date from public.households where id=item.household_id;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,category_id,payment_method_id,description) values(item.household_id,auth.uid(),'expense',p_amount,bought_date,p_account_id,p_category_id,p_payment_method_id,item.name) returning id into tx;
  if p_create_inventory then
    insert into public.inventory_items(household_id,created_by,name,purchase_date,purchase_price,transaction_id,notes) values(item.household_id,auth.uid(),item.name,bought_date,p_amount,tx,item.notes) returning id into inv;
  end if;
  update public.shopping_items set status='bought',transaction_id=tx,inventory_item_id=inv where id=item.id;
  return jsonb_build_object('transaction_id',tx,'inventory_item_id',inv);
end $$;
revoke all on function public.shopping_buy(uuid,numeric,uuid,uuid,uuid,boolean,date) from public;
grant execute on function public.shopping_buy(uuid,numeric,uuid,uuid,uuid,boolean,date) to authenticated;


