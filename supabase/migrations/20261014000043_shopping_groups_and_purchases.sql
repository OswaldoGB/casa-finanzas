-- Several store visits share one list; transactions remain the financial source.
alter table public.shopping_lists add column project_id uuid;
alter table public.shopping_lists add constraint shopping_lists_project_fk foreign key(project_id,household_id) references public.projects(id,household_id);
alter table public.shopping_list_items add constraint shopping_items_identity_unique unique(id,household_id);
create table public.shopping_list_groups (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null, list_id uuid not null, name text not null check(length(trim(name)) between 1 and 100),
  sort_order integer not null default 0 check(sort_order>=0), is_archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,list_id,household_id), foreign key(list_id,household_id) references public.shopping_lists(id,household_id) on delete cascade,
  foreign key(created_by,household_id) references public.profiles(id,household_id)
);
create table public.shopping_list_purchases (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null, list_id uuid not null, group_id uuid, store_name text not null default '',
  transaction_id uuid not null unique, request_key uuid not null, request_payload jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,list_id,household_id), unique(household_id,request_key),
  foreign key(list_id,household_id) references public.shopping_lists(id,household_id) on delete cascade,
  foreign key(group_id,list_id,household_id) references public.shopping_list_groups(id,list_id,household_id),
  foreign key(transaction_id,household_id) references public.transactions(id,household_id) on delete cascade,
  foreign key(created_by,household_id) references public.profiles(id,household_id)
);
alter table public.shopping_list_items add column group_id uuid,
  add column purchase_id uuid,
  add column resolution text not null default 'pending' check(resolution in ('pending','available','discarded','legacy_unbought')),
  add constraint shopping_item_group_fk foreign key(group_id,list_id,household_id) references public.shopping_list_groups(id,list_id,household_id),
  add constraint shopping_item_purchase_fk foreign key(purchase_id,list_id,household_id) references public.shopping_list_purchases(id,list_id,household_id);

-- Invoker guard: only owner-run RPCs may attach financial records.
create or replace function public.guard_shopping_list_item() returns trigger language plpgsql security invoker set search_path='' as $$
declare target public.shopping_list_items; state text;
begin
  if TG_OP='DELETE' then target:=old; else target:=new; end if;
  select status into state from public.shopping_lists where id=target.list_id and household_id=target.household_id for update;
  if TG_OP='DELETE' and not found then return old; end if;
  if TG_OP='UPDATE' and new.list_id is distinct from old.list_id then raise exception 'No se puede mover el artículo a otra lista'; end if;
  if current_user='authenticated' and state is distinct from 'open' then raise exception 'Reabre la lista para editar pendientes'; end if;
  if TG_OP='DELETE' and old.purchase_id is not null then raise exception 'Corrige primero el movimiento de esta compra'; end if;
  if TG_OP='UPDATE' and old.purchase_id is not null and new.purchase_id is not null
    and (new.name,new.quantity,new.unit,new.real_price,new.estimated_price,new.notes,new.group_id,new.resolution,new.checked)
      is distinct from (old.name,old.quantity,old.unit,old.real_price,old.estimated_price,old.notes,old.group_id,old.resolution,old.checked)
    then raise exception 'El desglose pagado no se puede editar; corrige su movimiento'; end if;
  if TG_OP<>'DELETE' then
    if new.purchase_id is not null and (new.resolution<>'pending' or not new.checked) then raise exception 'Estado de compra inválido'; end if;
    if new.resolution<>'pending' and new.checked then raise exception 'Un artículo resuelto no puede estar en carrito'; end if;
    if current_user='authenticated' and ((TG_OP='INSERT' and (new.purchase_id is not null or new.resolution='legacy_unbought'))
      or (TG_OP='UPDATE' and (new.purchase_id is distinct from old.purchase_id or new.resolution='legacy_unbought' and new.resolution is distinct from old.resolution))) then raise exception 'Registra la compra desde su formulario'; end if;
    if new.group_id is not null and not exists(select 1 from public.shopping_list_groups where id=new.group_id and list_id=new.list_id and household_id=new.household_id and not is_archived) and (TG_OP='INSERT' or new.group_id is distinct from old.group_id) then raise exception 'Lugar no disponible'; end if;
  end if;
  return target;
end $$;
-- Historical backfill does not create financial entries or reopen lists.
insert into public.shopping_list_groups(household_id,created_by,list_id,name)
  select household_id,created_by,id,store from public.shopping_lists where trim(store)<>'';
update public.shopping_list_items i set group_id=g.id from public.shopping_list_groups g where g.list_id=i.list_id and g.household_id=i.household_id;
insert into public.shopping_list_purchases(household_id,created_by,list_id,group_id,store_name,transaction_id,request_key,created_at)
  select l.household_id,l.created_by,l.id,g.id,l.store,l.transaction_id,gen_random_uuid(),coalesce(l.completed_at,l.updated_at)
  from public.shopping_lists l left join public.shopping_list_groups g on g.list_id=l.id where l.transaction_id is not null;
update public.shopping_list_items i set purchase_id=p.id from public.shopping_list_purchases p where p.list_id=i.list_id and i.checked;
update public.shopping_list_items i set resolution='legacy_unbought' from public.shopping_lists l where l.id=i.list_id and l.status<>'open' and not i.checked;

create or replace function public.guard_shopping_list_header() returns trigger language plpgsql set search_path='' as $$
begin
  if TG_OP='UPDATE' and new.transaction_id is distinct from old.transaction_id and not (new.transaction_id is null and current_user<>'authenticated') then raise exception 'El vínculo histórico no se cambia'; end if;
  if current_user='authenticated' and new.project_id is distinct from (case when TG_OP='UPDATE' then old.project_id else null end)
    and exists(select 1 from public.shopping_list_purchases where list_id=new.id) then raise exception 'Revisa los gastos antes de cambiar el proyecto'; end if;
  if new.project_id is not null and new.project_id is distinct from (case when TG_OP='UPDATE' then old.project_id else null end) and not public.has_module_access('projects','edit') then raise exception 'Sin permiso para vincular este proyecto'; end if;
  if new.status='completed' and (TG_OP='INSERT' or old.status is distinct from 'completed')
    and (not exists(select 1 from public.shopping_list_items where list_id=new.id)
      or exists(select 1 from public.shopping_list_items where list_id=new.id and purchase_id is null and resolution='pending')) then raise exception 'Resuelve los artículos pendientes primero'; end if;
  return new;
end $$;
drop trigger shopping_lists_purchase on public.shopping_lists;
create trigger shopping_lists_purchase before insert or update on public.shopping_lists for each row execute function public.guard_shopping_list_header();

do $$ declare t text; begin
  foreach t in array array['shopping_list_groups','shopping_list_purchases'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create index %I_list_idx on public.%I(list_id)',t,t);
    execute format('create policy %I_read on public.%I for select to authenticated using(household_id=(select public.current_household_id()) and (select public.has_module_access(''shopping_lists'',''view'')))',t,t);
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
end $$;
create policy shopping_groups_insert on public.shopping_list_groups for insert to authenticated with check(household_id=(select public.current_household_id()) and created_by=(select auth.uid()) and (select public.has_module_access('shopping_lists','edit')));
create policy shopping_groups_update on public.shopping_list_groups for update to authenticated using(household_id=(select public.current_household_id()) and (select public.has_module_access('shopping_lists','edit'))) with check(household_id=(select public.current_household_id()));
create index shopping_items_purchase_idx on public.shopping_list_items(purchase_id) where purchase_id is not null;
create index shopping_items_group_idx on public.shopping_list_items(list_id,group_id);
create index shopping_lists_project_idx on public.shopping_lists(project_id) where project_id is not null;

create function public.refresh_shopping_list_state(p_list_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.shopping_lists l set status=case when exists(select 1 from public.shopping_list_items i where i.list_id=l.id)
    and not exists(select 1 from public.shopping_list_items i where i.list_id=l.id and i.purchase_id is null and i.resolution='pending') then 'completed' else 'open' end,
    completed_at=case when not exists(select 1 from public.shopping_list_items i where i.list_id=l.id and i.purchase_id is null and i.resolution='pending') then now() else null end
    where l.id=p_list_id and l.status<>'archived';
end $$;
revoke all on function public.refresh_shopping_list_state(uuid) from public;

create function public.record_shopping_purchase(p_list_id uuid,p_group_id uuid,p_item_ids uuid[],p_account_id uuid,p_category_id uuid,p_date date,p_payment_method_id uuid,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.shopping_lists; existing public.shopping_list_purchases; purchase uuid; tx uuid; total numeric(14,2); store text:='Por decidir'; payload jsonb;
begin
  if not public.has_module_access('shopping_lists','edit') or not public.has_module_access('transactions','edit') then raise exception 'Sin permiso para registrar compras'; end if;
  if p_request_key is null or p_date is null or coalesce(cardinality(p_item_ids),0) not between 1 and 500 or cardinality(p_item_ids)<>(select count(distinct x) from unnest(p_item_ids) x) then raise exception 'Selección inválida'; end if;
  payload:=jsonb_build_object('list',p_list_id,'group',p_group_id,'items',(select jsonb_agg(x order by x) from unnest(p_item_ids) x),'account',p_account_id,'category',p_category_id,'date',p_date,'method',p_payment_method_id);
  -- The operation key serializes retries even when two requests target different lists.
  perform pg_advisory_xact_lock(hashtextextended(public.current_household_id()::text||p_request_key::text,0));
  select * into existing from public.shopping_list_purchases where household_id=public.current_household_id() and request_key=p_request_key;
  if found then
    if existing.request_payload<>payload then raise exception 'La operación ya se usó para otra compra'; end if;
    return jsonb_build_object('purchase_id',existing.id,'transaction_id',existing.transaction_id);
  end if;
  select * into l from public.shopping_lists where id=p_list_id and household_id=public.current_household_id() for update;
  if not found or l.status<>'open' then raise exception 'La lista debe estar abierta'; end if;
  if l.project_id is not null and not public.has_module_access('projects','edit') then raise exception 'Sin permiso para modificar el proyecto'; end if;
  if p_group_id is not null then
    select name into store from public.shopping_list_groups where id=p_group_id and list_id=l.id and household_id=l.household_id and not is_archived;
    if not found then raise exception 'Lugar no disponible'; end if;
  end if;
  perform 1 from public.shopping_list_items where id=any(p_item_ids) and list_id=l.id for update;
  if (select count(*) from public.shopping_list_items where id=any(p_item_ids) and list_id=l.id and household_id=l.household_id and group_id is not distinct from p_group_id and purchase_id is null and resolution='pending' and checked and real_price is not null)<>cardinality(p_item_ids) then raise exception 'Selecciona artículos de este lugar, en carrito y con precio'; end if;
  select round(sum(real_price*quantity),2) into total from public.shopping_list_items where id=any(p_item_ids) and list_id=l.id;
  if total<=0 then raise exception 'El total debe ser mayor que cero'; end if;
  perform public.validate_purchase_refs(l.household_id,p_account_id,p_category_id,p_payment_method_id);
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,category_id,payment_method_id,project_id,description)
    values(l.household_id,auth.uid(),'expense',total,p_date,p_account_id,p_category_id,p_payment_method_id,l.project_id,left(l.name||' · '||store,240)) returning id into tx;
  insert into public.shopping_list_purchases(household_id,created_by,list_id,group_id,store_name,transaction_id,request_key,request_payload)
    values(l.household_id,auth.uid(),l.id,p_group_id,store,tx,p_request_key,payload) returning id into purchase;
  update public.shopping_list_items set purchase_id=purchase where id=any(p_item_ids) and list_id=l.id;
  perform public.refresh_shopping_list_state(l.id);
  return jsonb_build_object('purchase_id',purchase,'transaction_id',tx);
end $$;
revoke all on function public.record_shopping_purchase(uuid,uuid,uuid[],uuid,uuid,date,uuid,uuid) from public;
grant execute on function public.record_shopping_purchase(uuid,uuid,uuid[],uuid,uuid,date,uuid,uuid) to authenticated;

create function public.set_shopping_item_resolution(p_item_id uuid,p_resolution text) returns void language plpgsql security definer set search_path='' as $$
declare item public.shopping_list_items; lid uuid;
begin
  if not public.has_module_access('shopping_lists','edit') or p_resolution not in ('pending','available','discarded') or p_resolution is null then raise exception 'Estado inválido o sin permiso'; end if;
  select list_id into lid from public.shopping_list_items where id=p_item_id and household_id=public.current_household_id();
  perform 1 from public.shopping_lists where id=lid and status='open' for update;
  if not found then raise exception 'Reabre la lista primero'; end if;
  select * into item from public.shopping_list_items where id=p_item_id and household_id=public.current_household_id() for update;
  if not found or item.purchase_id is not null then raise exception 'Corrige primero la compra registrada'; end if;
  update public.shopping_list_items set resolution=p_resolution,checked=false where id=p_item_id;
  perform public.refresh_shopping_list_state(lid);
end $$;
create function public.reopen_shopping_list(p_list_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_module_access('shopping_lists','edit') then raise exception 'Sin permiso'; end if;
  update public.shopping_lists set status='open',completed_at=null where id=p_list_id and household_id=public.current_household_id() and status='completed';
  if not found then raise exception 'Lista no disponible'; end if;
end $$;
revoke all on function public.set_shopping_item_resolution(uuid,text),public.reopen_shopping_list(uuid) from public;
grant execute on function public.set_shopping_item_resolution(uuid,text),public.reopen_shopping_list(uuid) to authenticated;

create function public.restore_shopping_purchase() returns trigger language plpgsql security definer set search_path='' as $$
declare lid uuid;
begin
  if exists(select 1 from public.shopping_list_purchases where transaction_id=old.id) then
    if not public.has_module_access('transactions','edit') then raise exception 'Sin permiso para borrar esta compra'; end if;
    perform public.assert_transactions_unfinanced(array[old.id]);
    select list_id into lid from public.shopping_list_purchases where transaction_id=old.id;
    perform 1 from public.shopping_lists where id=lid for update;
    update public.shopping_lists set status='open',completed_at=null,transaction_id=case when transaction_id=old.id then null else transaction_id end where id=lid;
    update public.shopping_list_items set purchase_id=null,checked=true,resolution='pending' where purchase_id in(select id from public.shopping_list_purchases where transaction_id=old.id);
    delete from public.shopping_list_purchases where transaction_id=old.id;
  end if;
  return old;
end $$;
create trigger transactions_restore_shopping before delete on public.transactions for each row execute function public.restore_shopping_purchase();
revoke all on function public.restore_shopping_purchase() from public;

create or replace function public.close_shopping_list(p_list_id uuid,p_account_id uuid,p_category_id uuid,p_payment_method_id uuid default null,p_carry_unchecked boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare ids uuid[]; gid uuid; result jsonb; today date;
begin
  if (select count(*) from (select distinct group_id from public.shopping_list_items where list_id=p_list_id and household_id=public.current_household_id() and checked and purchase_id is null and resolution='pending') g)>1 then raise exception 'Actualiza la app y registra cada lugar por separado'; end if;
  select array_agg(id),min(group_id::text)::uuid into ids,gid from public.shopping_list_items where list_id=p_list_id and household_id=public.current_household_id() and checked and purchase_id is null and resolution='pending';
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  result:=public.record_shopping_purchase(p_list_id,gid,ids,p_account_id,p_category_id,today,p_payment_method_id,gen_random_uuid());
  return jsonb_build_object('transaction_id',result->'transaction_id','new_list_id',null);
end $$;

create or replace function public.duplicate_shopping_list(p_list_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.shopping_lists; next_list uuid; g record; new_group uuid;
begin
  if not public.has_module_access('shopping_lists','edit') then raise exception 'Sin permiso'; end if;
  select * into l from public.shopping_lists where id=p_list_id and household_id=public.current_household_id() for update;
  if not found then raise exception 'Lista no disponible'; end if;
  insert into public.shopping_lists(household_id,created_by,name,budget) values(l.household_id,auth.uid(),left(l.name||' · copia',100),l.budget) returning id into next_list;
  for g in select * from public.shopping_list_groups where list_id=l.id loop
    insert into public.shopping_list_groups(household_id,created_by,list_id,name,sort_order) values(l.household_id,auth.uid(),next_list,g.name,g.sort_order) returning id into new_group;
    insert into public.shopping_list_items(household_id,created_by,list_id,group_id,name,quantity,unit,estimated_price,notes,sort_order)
      select household_id,auth.uid(),next_list,new_group,name,quantity,unit,coalesce(real_price,estimated_price),notes,sort_order from public.shopping_list_items where list_id=l.id and group_id=g.id;
  end loop;
  insert into public.shopping_list_items(household_id,created_by,list_id,name,quantity,unit,estimated_price,notes,sort_order)
    select household_id,auth.uid(),next_list,name,quantity,unit,coalesce(real_price,estimated_price),notes,sort_order from public.shopping_list_items where list_id=l.id and group_id is null;
  return next_list;
end $$;
