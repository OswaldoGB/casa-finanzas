create function public.inventory_create_with_packages(p_item jsonb, p_label text, p_count integer, p_capacity integer, p_group text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_home uuid; v_total numeric;
begin
  if auth.uid() is null or not public.has_module_access('inventory','edit') then raise exception 'Sin permiso'; end if;
  if p_count is null or p_count not between 1 and 1000 or p_capacity is null or p_capacity not between 1 and 1000000 or length(trim(coalesce(p_label,''))) not between 1 and 60 or length(trim(coalesce(p_group,''))) > 60 then raise exception 'Presentación inválida'; end if;
  v_total := p_count::numeric * p_capacity;
  if v_total > 9999999 then raise exception 'Cantidad excesiva'; end if;
  v_home := public.current_household_id();
  insert into public.inventory_items(household_id,created_by,name,location,category,quantity,purchase_date,purchase_price,warranty_until,condition,notes,transaction_id)
  values(v_home,auth.uid(),p_item->>'name',coalesce(p_item->>'location',''),coalesce(p_item->>'category',''),v_total,nullif(p_item->>'purchase_date','')::date,nullif(p_item->>'purchase_price','')::numeric,nullif(p_item->>'warranty_until','')::date,coalesce(p_item->>'condition','good'),coalesce(p_item->>'notes',''),nullif(p_item->>'transaction_id','')::uuid) returning id into v_id;
  delete from public.inventory_packages where item_id=v_id and household_id=v_home;
  perform public.inventory_add_packages(v_id,p_label,p_count,p_capacity,p_group);
  return v_id;
end $$;
revoke all on function public.inventory_create_with_packages(jsonb,text,integer,integer,text) from public;
grant execute on function public.inventory_create_with_packages(jsonb,text,integer,integer,text) to authenticated;
