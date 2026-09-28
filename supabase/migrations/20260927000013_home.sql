-- Hogar: proyectos, inventario, deseos y listas compartidas.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  description text not null default '',
  budget numeric(14,2) not null default 0 check (budget >= 0),
  start_date date,
  end_date date,
  status text not null default 'planned' check (status in ('planned','active','completed','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,household_id),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  check (end_date is null or start_date is null or end_date >= start_date)
);
alter table public.transactions add constraint transactions_project_fk foreign key(project_id,household_id) references public.projects(id,household_id);
alter table public.recurring_rules add constraint recurring_project_fk foreign key(project_id,household_id) references public.projects(id,household_id);
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  location text not null default '', category text not null default '',
  quantity numeric(10,3) not null default 1 check(quantity > 0),
  purchase_date date, purchase_price numeric(14,2) check(purchase_price >= 0),
  warranty_until date, condition text not null default 'good',
  photo_path text, notes text not null default '', transaction_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,household_id),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  foreign key(transaction_id,household_id) references public.transactions(id,household_id),
  check(photo_path is null or photo_path like household_id::text || '/' || id::text || '/%')
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  estimated_price numeric(14,2) check(estimated_price >= 0),
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  target_date date, url text, notes text not null default '',
  sort_order integer not null default 0,
  status text not null default 'pending' check(status in ('pending','bought','discarded')),
  transaction_id uuid, inventory_item_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,household_id),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  foreign key(transaction_id,household_id) references public.transactions(id,household_id),
  foreign key(inventory_item_id,household_id) references public.inventory_items(id,household_id)
);
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check(length(trim(name)) between 1 and 100),
  store text not null default '', budget numeric(14,2) check(budget > 0),
  status text not null default 'open' check(status in ('open','completed','archived')),
  transaction_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,household_id),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  foreign key(transaction_id,household_id) references public.transactions(id,household_id)
);
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null, list_id uuid not null,
  name text not null check(length(trim(name)) between 1 and 100),
  quantity numeric(10,3) not null default 1 check(quantity > 0),
  unit text not null default '', estimated_price numeric(14,2) check(estimated_price >= 0),
  real_price numeric(14,2) check(real_price >= 0), checked boolean not null default false,
  sort_order integer not null default 0, notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  foreign key(list_id,household_id) references public.shopping_lists(id,household_id) on delete cascade
);
do $$ declare t text; m text; begin
  foreach t in array array['projects','inventory_items','shopping_items','shopping_lists','shopping_list_items'] loop
    m := case t when 'inventory_items' then 'inventory' when 'shopping_items' then 'shopping' when 'shopping_list_items' then 'shopping_lists' else t end;
    execute format('alter table public.%I enable row level security',t);
    execute format('create trigger %I_identity before update on public.%I for each row execute function public.finance_immutable_identity()',t,t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
    execute format('create index %I_household_idx on public.%I(household_id)',t,t);
    execute format('create policy %I_read on public.%I for select to authenticated using (household_id=(select public.current_household_id()) and (select public.has_module_access(%L,''view'')))',t,t,m);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(household_id=(select public.current_household_id()) and created_by=(select auth.uid()) and (select public.has_module_access(%L,''edit'')))',t,t,m);
    execute format('create policy %I_update on public.%I for update to authenticated using(household_id=(select public.current_household_id()) and (select public.has_module_access(%L,''edit''))) with check(household_id=(select public.current_household_id()) and (select public.has_module_access(%L,''edit'')))',t,t,m,m);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(household_id=(select public.current_household_id()) and (select public.has_module_access(%L,''edit'')))',t,t,m);
  end loop;
end $$;
-- Proyectos son catálogo compartido para vincular movimientos y reportes.
drop policy projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using(household_id=(select public.current_household_id()) and ((select public.has_module_access('projects','view')) or (select public.has_module_access('transactions','view')) or (select public.has_module_access('reports','view')) or (select public.has_module_access('dashboard','view'))));
create index shopping_list_items_list_idx on public.shopping_list_items(list_id,sort_order);
create index transactions_project_idx on public.transactions(project_id) where project_id is not null;

-- Un artículo siempre toma el mismo bloqueo que el cierre de su lista.
create function public.guard_shopping_list_item() returns trigger language plpgsql security definer set search_path='' as $$
declare list_status text; target public.shopping_list_items;
begin
  if TG_OP='DELETE' then target:=old; else target:=new; end if;
  if TG_OP='UPDATE' and new.list_id is distinct from old.list_id then raise exception 'No se puede mover el artículo a otra lista'; end if;
  select l.status into list_status from public.shopping_lists l where l.id=target.list_id and l.household_id=target.household_id for update;
  if TG_OP='DELETE' and not found then return old; end if;
  if list_status is distinct from 'open' then raise exception 'La lista ya está cerrada'; end if;
  return target;
end $$;
revoke all on function public.guard_shopping_list_item() from public;
create trigger shopping_list_items_open before insert or update or delete on public.shopping_list_items for each row execute function public.guard_shopping_list_item();

-- Una compra procesada no puede reabrirse para generar un segundo gasto.
create function public.guard_home_purchase() returns trigger language plpgsql set search_path='' as $$
begin
  if TG_OP='UPDATE' and old.transaction_id is not null then
    if new.transaction_id is distinct from old.transaction_id then raise exception 'No se puede cambiar el gasto vinculado'; end if;
    if (TG_TABLE_NAME='shopping_lists' and new.status='open') or (TG_TABLE_NAME='shopping_items' and new.status='pending') then raise exception 'Una compra registrada no puede reabrirse'; end if;
  end if;
  if (TG_TABLE_NAME='shopping_lists' and new.status='completed') or (TG_TABLE_NAME='shopping_items' and new.status='bought') then
    if new.transaction_id is null then raise exception 'Registra el gasto para completar la compra'; end if;
  end if;
  if new.transaction_id is not null and (TG_OP='INSERT' or new.transaction_id is distinct from old.transaction_id) and not public.has_module_access('transactions','edit') then raise exception 'No tienes permiso para vincular un gasto'; end if;
  if new.transaction_id is not null and (TG_OP='INSERT' or new.transaction_id is distinct from old.transaction_id) and not exists(select 1 from public.transactions t where t.id=new.transaction_id and t.household_id=new.household_id and t.type='expense' and t.status='posted') then raise exception 'El movimiento vinculado debe ser un gasto confirmado'; end if;
  return new;
end $$;
revoke all on function public.guard_home_purchase() from public;
create trigger shopping_lists_purchase before insert or update on public.shopping_lists for each row execute function public.guard_home_purchase();
create trigger shopping_items_purchase before insert or update on public.shopping_items for each row execute function public.guard_home_purchase();

-- Comprobar referencias activas dentro del hogar aun dentro de RPC con privilegios.
create function public.validate_purchase_refs(p_home uuid,p_account uuid,p_category uuid,p_method uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.accounts where id=p_account and household_id=p_home and not is_archived for share;
  if not found then raise exception 'Selecciona una cuenta activa'; end if;
  perform 1 from public.categories where id=p_category and household_id=p_home and type='expense' and not is_archived for share;
  if not found then raise exception 'Selecciona una categoría de gasto activa'; end if;
  if p_method is not null then
    perform 1 from public.payment_methods where id=p_method and household_id=p_home and not is_archived for share;
    if not found then raise exception 'Selecciona un método de pago activo'; end if;
  end if;
end $$;
revoke all on function public.validate_purchase_refs(uuid,uuid,uuid,uuid) from public;

create function public.close_shopping_list(p_list_id uuid,p_account_id uuid,p_category_id uuid,p_payment_method_id uuid,p_carry_unchecked boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
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

create function public.duplicate_shopping_list(p_list_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.shopping_lists; next_list uuid;
begin
  if not public.has_module_access('shopping_lists','edit') then raise exception 'No tienes permiso para duplicar listas'; end if;
  select * into l from public.shopping_lists where id=p_list_id and household_id=public.current_household_id() for update;
  if not found then raise exception 'No se encontró la lista'; end if;
  insert into public.shopping_lists(household_id,created_by,name,store,budget) values(l.household_id,auth.uid(),left(l.name || ' · copia',100),l.store,l.budget) returning id into next_list;
  insert into public.shopping_list_items(household_id,created_by,list_id,name,quantity,unit,estimated_price,sort_order,notes) select household_id,auth.uid(),next_list,name,quantity,unit,coalesce(real_price,estimated_price),sort_order,notes from public.shopping_list_items where list_id=l.id;
  return next_list;
end $$;
revoke all on function public.duplicate_shopping_list(uuid) from public;
grant execute on function public.duplicate_shopping_list(uuid) to authenticated;

create function public.shopping_buy(p_item_id uuid,p_amount numeric,p_account_id uuid,p_category_id uuid,p_payment_method_id uuid,p_create_inventory boolean default false,p_date date default null) returns jsonb language plpgsql security definer set search_path='' as $$
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

create function public.project_snapshot() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'budget',p.budget,'start_date',p.start_date,'end_date',p.end_date,'status',p.status,'spent',coalesce((select sum(t.amount) from public.transactions t where t.project_id=p.id and t.household_id=p.household_id and t.type='expense' and t.status='posted'),0),'expenses',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'date',t.date,'description',t.description,'amount',t.amount) order by t.date desc) from public.transactions t where t.project_id=p.id and t.household_id=p.household_id and t.type='expense' and t.status='posted'),'[]'::jsonb)) order by p.created_at desc),'[]'::jsonb) from public.projects p where p.household_id=public.current_household_id() and public.has_module_access('projects','view')
$$;
revoke all on function public.project_snapshot() from public;
grant execute on function public.project_snapshot() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('inventory','inventory',false,10485760,array['image/jpeg','image/webp']) on conflict(id) do nothing;
create policy inventory_photos_read on storage.objects for select to authenticated using(bucket_id='inventory' and public.has_module_access('inventory','view') and exists(select 1 from public.inventory_items i where i.household_id=public.current_household_id() and i.household_id::text=(storage.foldername(name))[1] and i.id::text=(storage.foldername(name))[2]));
create policy inventory_photos_insert on storage.objects for insert to authenticated with check(bucket_id='inventory' and public.has_module_access('inventory','edit') and exists(select 1 from public.inventory_items i where i.household_id=public.current_household_id() and i.household_id::text=(storage.foldername(name))[1] and i.id::text=(storage.foldername(name))[2]));
create policy inventory_photos_delete on storage.objects for delete to authenticated using(bucket_id='inventory' and public.has_module_access('inventory','edit') and exists(select 1 from public.inventory_items i where i.household_id=public.current_household_id() and i.household_id::text=(storage.foldername(name))[1] and i.id::text=(storage.foldername(name))[2]));
do $$ declare t text; begin
  foreach t in array array['shopping_lists','shopping_list_items'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
end $$;

