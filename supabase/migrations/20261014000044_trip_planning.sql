create table public.trip_details (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null, project_id uuid not null unique, destination text not null default '' check(length(destination)<=200), participants text not null default '' check(length(participants)<=500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,household_id),
  foreign key(project_id,household_id) references public.projects(id,household_id) on delete cascade,
  foreign key(created_by,household_id) references public.profiles(id,household_id)
);
create table public.trip_activities (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade, created_by uuid not null,
  project_id uuid not null, date date not null, kind text not null check(kind in ('breakfast','lunch','dinner','snack','outing','experience','other')),
  time time, title text not null check(length(trim(title)) between 1 and 100), location text not null default '' check(length(location)<=200), notes text not null default '' check(length(notes)<=2000), sort_order integer not null default 0,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,project_id,household_id),
  foreign key(project_id,household_id) references public.trip_details(project_id,household_id) on delete cascade,
  foreign key(created_by,household_id) references public.profiles(id,household_id)
);
create table public.trip_cost_lines (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade, created_by uuid not null,
  project_id uuid not null, activity_id uuid, name text not null check(length(trim(name)) between 1 and 100),
  quantity numeric(10,3) not null default 1 check(quantity>0),unit text not null default '' check(length(unit)<=30), estimated_price numeric(14,2) check(estimated_price>=0), category_id uuid, is_settled boolean not null default false,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,project_id,household_id),
  foreign key(project_id,household_id) references public.trip_details(project_id,household_id) on delete cascade,
  foreign key(activity_id,project_id,household_id) references public.trip_activities(id,project_id,household_id),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  foreign key(category_id) references public.categories(id)
);
create table public.trip_cost_transactions (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade, created_by uuid not null,
  project_id uuid not null,cost_line_id uuid not null,transaction_id uuid not null unique,request_key uuid,request_payload jsonb,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  foreign key(cost_line_id,project_id,household_id) references public.trip_cost_lines(id,project_id,household_id) on delete cascade,
  foreign key(transaction_id,household_id) references public.transactions(id,household_id) on delete cascade,
  foreign key(created_by,household_id) references public.profiles(id,household_id),unique(household_id,request_key)
);
create table public.trip_activity_items (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade, created_by uuid not null,
  project_id uuid not null,activity_id uuid not null,item_id uuid not null,required_quantity numeric(10,3) not null check(required_quantity>0),unit text not null default '' check(length(unit)<=30),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(activity_id,item_id),
  foreign key(activity_id,project_id,household_id) references public.trip_activities(id,project_id,household_id) on delete cascade,
  foreign key(item_id,household_id) references public.shopping_list_items(id,household_id) on delete cascade,
  foreign key(created_by,household_id) references public.profiles(id,household_id)
);
do $$ declare t text; begin
  foreach t in array array['trip_details','trip_activities','trip_cost_lines','trip_cost_transactions','trip_activity_items'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create index %I_project_idx on public.%I(project_id)',t,t);
    execute format('create policy %I_read on public.%I for select to authenticated using(household_id=(select public.current_household_id()) and (select public.has_module_access(''projects'',''view'')))',t,t);
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
  foreach t in array array['trip_activities','trip_cost_lines','trip_activity_items'] loop
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(household_id=(select public.current_household_id()) and created_by=(select auth.uid()) and (select public.has_module_access(''projects'',''edit'')))',t,t);
    execute format('create policy %I_update on public.%I for update to authenticated using(household_id=(select public.current_household_id()) and (select public.has_module_access(''projects'',''edit''))) with check(household_id=(select public.current_household_id()))',t,t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(household_id=(select public.current_household_id()) and (select public.has_module_access(''projects'',''edit'')))',t,t);
  end loop;
end $$;
create function public.guard_trip_row() returns trigger language plpgsql set search_path='' as $$
declare p public.projects; item public.shopping_list_items;
begin
  if TG_OP='UPDATE' and (new.id,new.household_id,new.created_by,new.project_id) is distinct from (old.id,old.household_id,old.created_by,old.project_id) then raise exception 'La identidad del registro no se cambia'; end if;
  select * into p from public.projects where id=new.project_id and household_id=new.household_id for share;
  if not found then raise exception 'Viaje inválido'; end if;
  if TG_TABLE_NAME='trip_activities' then
    if new.date<p.start_date or new.date>p.end_date then raise exception 'La actividad debe estar dentro de las fechas del viaje'; end if;
  end if;
  if TG_TABLE_NAME='trip_cost_lines' then
    if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and household_id=new.household_id and type='expense' and not is_archived) then raise exception 'Categoría inválida'; end if;
  end if;
  if TG_TABLE_NAME='trip_activity_items' then
    if not public.has_module_access('shopping_lists','edit') then raise exception 'Sin permiso para vincular productos'; end if;
    select * into item from public.shopping_list_items where id=new.item_id and household_id=new.household_id;
    if not found or item.unit<>new.unit or not exists(select 1 from public.shopping_lists where id=item.list_id and project_id=new.project_id and household_id=new.household_id) then raise exception 'El producto o su unidad no pertenecen al viaje'; end if;
  end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['trip_details','trip_activities','trip_cost_lines','trip_activity_items'] loop
    execute format('create trigger %I_guard before insert or update on public.%I for each row execute function public.guard_trip_row()',t,t);
  end loop;
end $$;
create function public.guard_trip_project_dates() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.trip_details where project_id=new.id) then
    if new.start_date is null or new.end_date is null or exists(select 1 from public.trip_activities where project_id=new.id and (date<new.start_date or date>new.end_date)) then raise exception 'Mueve las actividades fuera del rango antes de cambiar las fechas'; end if;
  end if;
  return new;
end $$;
create trigger projects_trip_dates before update on public.projects for each row execute function public.guard_trip_project_dates();

create function public.save_trip(p_project_id uuid,p_name text,p_budget numeric,p_start_date date,p_end_date date,p_status text,p_destination text,p_participants text,p_description text) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
  if not public.has_module_access('projects','edit') then raise exception 'Sin permiso para editar viajes'; end if;
  if p_start_date is null or p_end_date is null or p_end_date<p_start_date or p_budget is null or p_budget<0 or round(p_budget,2)<>p_budget then raise exception 'Fechas o presupuesto inválidos'; end if;
  if p_project_id is null then
    insert into public.projects(household_id,created_by,name,budget,start_date,end_date,status,description) values(public.current_household_id(),auth.uid(),p_name,p_budget,p_start_date,p_end_date,p_status,p_description) returning id into pid;
    insert into public.trip_details(household_id,created_by,project_id,destination,participants) values(public.current_household_id(),auth.uid(),pid,p_destination,p_participants);
  else
    perform 1 from public.projects where id=p_project_id and household_id=public.current_household_id() for update;
    perform 1 from public.trip_details where project_id=p_project_id and household_id=public.current_household_id() for update;
    if not found then raise exception 'Viaje no encontrado'; end if;
    update public.projects set name=p_name,budget=p_budget,start_date=p_start_date,end_date=p_end_date,status=p_status,description=p_description where id=p_project_id and household_id=public.current_household_id();
    update public.trip_details set destination=p_destination,participants=p_participants where project_id=p_project_id and household_id=public.current_household_id();
    pid:=p_project_id;
  end if;
  return pid;
end $$;

create function public.ensure_trip_shopping_list(p_project_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare lid uuid; title text;
begin
  if not public.has_module_access('projects','edit') or not public.has_module_access('shopping_lists','edit') then raise exception 'Sin permiso para preparar compras'; end if;
  perform pg_advisory_xact_lock(hashtextextended('trip-list'||p_project_id::text,0));
  select p.name into title from public.projects p join public.trip_details d on d.project_id=p.id where p.id=p_project_id and p.household_id=public.current_household_id() for share of p;
  if not found then raise exception 'Viaje no disponible'; end if;
  select id into lid from public.shopping_lists where project_id=p_project_id and household_id=public.current_household_id() and status<>'archived' order by created_at limit 1 for update;
  if found then
    update public.shopping_lists set status='open',completed_at=null where id=lid and status='completed';
  else
    insert into public.shopping_lists(household_id,created_by,name,project_id) values(public.current_household_id(),auth.uid(),left('Compras · '||title,100),p_project_id) returning id into lid;
  end if;
  return lid;
end $$;

create function public.link_trip_item(p_activity_id uuid,p_item_id uuid,p_quantity numeric,p_unit text,p_adjust_purchase boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare a public.trip_activities; i public.shopping_list_items; total numeric;
begin
  if not public.has_module_access('projects','edit') or not public.has_module_access('shopping_lists','edit') then raise exception 'Sin permiso para vincular productos'; end if;
  select * into a from public.trip_activities where id=p_activity_id and household_id=public.current_household_id();
  if not found then raise exception 'Actividad no encontrada'; end if;
  select * into i from public.shopping_list_items where id=p_item_id and household_id=a.household_id;
  if not found then raise exception 'Producto no encontrado'; end if;
  perform 1 from public.shopping_lists where id=i.list_id and project_id=a.project_id and household_id=a.household_id for update;
  if not found or i.unit<>p_unit then raise exception 'Producto o unidad ajenos al viaje'; end if;
  select * into i from public.shopping_list_items where id=p_item_id for update;
  if p_adjust_purchase and i.purchase_id is not null then raise exception 'No se modifica una cantidad ya pagada; agrega un pendiente'; end if;
  insert into public.trip_activity_items(household_id,created_by,project_id,activity_id,item_id,required_quantity,unit)
    values(a.household_id,auth.uid(),a.project_id,a.id,i.id,p_quantity,p_unit)
    on conflict(activity_id,item_id) do update set required_quantity=excluded.required_quantity,unit=excluded.unit;
  if p_adjust_purchase then
    select sum(required_quantity) into total from public.trip_activity_items where item_id=i.id;
    update public.shopping_list_items set quantity=total where id=i.id;
  end if;
end $$;

create function public.create_trip_activity_item(p_activity_id uuid,p_name text,p_quantity numeric,p_unit text,p_estimated_price numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.trip_activities; lid uuid; iid uuid;
begin
  select * into a from public.trip_activities where id=p_activity_id and household_id=public.current_household_id();
  if not found then raise exception 'Actividad no disponible'; end if;
  lid:=public.ensure_trip_shopping_list(a.project_id);
  insert into public.shopping_list_items(household_id,created_by,list_id,name,quantity,unit,estimated_price) values(a.household_id,auth.uid(),lid,p_name,p_quantity,p_unit,p_estimated_price) returning id into iid;
  perform public.link_trip_item(a.id,iid,p_quantity,p_unit,false);
  return iid;
end $$;

create function public.link_trip_cost_transaction(p_line_id uuid,p_transaction_id uuid,p_settle boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare line public.trip_cost_lines; tx public.transactions;
begin
  if not public.has_module_access('projects','edit') or not public.has_module_access('transactions','edit') then raise exception 'Sin permiso para vincular movimientos'; end if;
  select * into line from public.trip_cost_lines where id=p_line_id and household_id=public.current_household_id();
  if not found then raise exception 'Concepto no disponible'; end if;
  select * into tx from public.transactions where id=p_transaction_id and household_id=line.household_id for update;
  if not found or tx.type<>'expense' or tx.status<>'posted' or (tx.project_id is not null and tx.project_id<>line.project_id) then raise exception 'El movimiento debe ser un gasto libre o de este viaje'; end if;
  if exists(select 1 from public.shopping_list_purchases where transaction_id=tx.id) then raise exception 'La compra ya figura en el presupuesto; no se duplica como concepto'; end if;
  if exists(select 1 from public.trip_cost_transactions where transaction_id=tx.id and cost_line_id=line.id) then return; end if;
  update public.transactions set project_id=line.project_id where id=tx.id;
  insert into public.trip_cost_transactions(household_id,created_by,project_id,cost_line_id,transaction_id) values(line.household_id,auth.uid(),line.project_id,line.id,tx.id);
  if p_settle then update public.trip_cost_lines set is_settled=true where id=line.id; end if;
end $$;

create function public.assign_shopping_list_project(p_list_id uuid,p_project_id uuid,p_confirm_financial_change boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare l public.shopping_lists;
begin
  if not public.has_module_access('projects','edit') or not public.has_module_access('shopping_lists','edit') then raise exception 'Sin permiso para vincular listas'; end if;
  perform 1 from public.projects where id=p_project_id and household_id=public.current_household_id() for share;
  if p_project_id is not null and not found then raise exception 'Proyecto no disponible'; end if;
  select * into l from public.shopping_lists where id=p_list_id and household_id=public.current_household_id() for update;
  if not found then raise exception 'Lista no disponible'; end if;
  if l.project_id is not distinct from p_project_id then return; end if;
  if exists(select 1 from public.trip_activity_items a join public.shopping_list_items i on i.id=a.item_id where i.list_id=l.id) then raise exception 'Quita los vínculos de actividades antes de mover la lista'; end if;
  if exists(select 1 from public.shopping_list_purchases where list_id=l.id) then
    if not p_confirm_financial_change or not public.has_module_access('transactions','edit') then raise exception 'Confirma el cambio de proyecto de los gastos de esta lista'; end if;
    if exists(select 1 from public.shopping_list_purchases p join public.transactions t on t.id=p.transaction_id where p.list_id=l.id and t.project_id is not null and t.project_id is distinct from l.project_id and t.project_id is distinct from p_project_id) then raise exception 'Hay gastos vinculados a otro proyecto'; end if;
  end if;
  update public.shopping_lists set project_id=p_project_id where id=l.id;
  update public.transactions t set project_id=p_project_id from public.shopping_list_purchases p where p.transaction_id=t.id and p.list_id=l.id;
end $$;

create function public.guard_trip_transaction_project() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.type<>'expense' or new.status<>'posted') and (exists(select 1 from public.trip_cost_transactions where transaction_id=old.id) or exists(select 1 from public.shopping_list_purchases where transaction_id=old.id)) then raise exception 'Una compra o concepto vinculado debe seguir siendo un gasto confirmado'; end if;
  if new.project_id is distinct from old.project_id and exists(select 1 from public.trip_cost_transactions where transaction_id=old.id) then raise exception 'Desvincula el concepto del viaje antes de cambiar el proyecto'; end if;
  if new.project_id is distinct from old.project_id and exists(select 1 from public.shopping_list_purchases p join public.shopping_lists l on l.id=p.list_id where p.transaction_id=old.id and l.project_id is distinct from new.project_id) then raise exception 'Cambia el proyecto desde la lista para conservar sus vínculos'; end if;
  return new;
end $$;
create trigger transactions_trip_project before update on public.transactions for each row execute function public.guard_trip_transaction_project();
create function public.record_trip_expense(p_line_id uuid,p_amount numeric,p_date date,p_account_id uuid,p_category_id uuid,p_method_id uuid,p_request_key uuid,p_settle boolean default true) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.trip_cost_lines; existing public.trip_cost_transactions; tx uuid; payload jsonb;
begin
  if not public.has_module_access('projects','edit') or not public.has_module_access('transactions','edit') then raise exception 'Sin permiso para registrar gastos'; end if;
  if p_request_key is null or p_date is null or p_amount is null or p_amount<=0 or round(p_amount,2)<>p_amount then raise exception 'Monto o fecha inválidos'; end if;
  payload:=jsonb_build_object('line',p_line_id,'amount',p_amount,'date',p_date,'account',p_account_id,'category',p_category_id,'method',p_method_id,'settle',p_settle);
  perform pg_advisory_xact_lock(hashtextextended('trip'||public.current_household_id()::text||p_request_key::text,0));
  select * into existing from public.trip_cost_transactions where household_id=public.current_household_id() and request_key=p_request_key;
  if found then
    if existing.request_payload<>payload then raise exception 'La operación ya se usó para otro gasto'; end if;
    return existing.transaction_id;
  end if;
  select * into c from public.trip_cost_lines where id=p_line_id and household_id=public.current_household_id() for update;
  if not found then raise exception 'Concepto no disponible'; end if;
  perform public.validate_purchase_refs(c.household_id,p_account_id,p_category_id,p_method_id);
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,category_id,payment_method_id,project_id,description)
    values(c.household_id,auth.uid(),'expense',p_amount,p_date,p_account_id,p_category_id,p_method_id,c.project_id,c.name) returning id into tx;
  insert into public.trip_cost_transactions(household_id,created_by,project_id,cost_line_id,transaction_id,request_key,request_payload)
    values(c.household_id,auth.uid(),c.project_id,c.id,tx,p_request_key,payload);
  if p_settle then update public.trip_cost_lines set is_settled=true where id=c.id; end if;
  return tx;
end $$;
create function public.remove_trip_activity(p_activity_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_module_access('projects','edit') then raise exception 'Sin permiso'; end if;
  perform 1 from public.trip_activities where id=p_activity_id and household_id=public.current_household_id() for update;
  if not found then raise exception 'Actividad no disponible'; end if;
  update public.trip_cost_lines set activity_id=null where activity_id=p_activity_id and household_id=public.current_household_id();
  delete from public.trip_activities where id=p_activity_id and household_id=public.current_household_id();
end $$;
revoke all on function public.record_trip_expense(uuid,numeric,date,uuid,uuid,uuid,uuid,boolean),public.remove_trip_activity(uuid) from public;
grant execute on function public.record_trip_expense(uuid,numeric,date,uuid,uuid,uuid,uuid,boolean),public.remove_trip_activity(uuid) to authenticated;
create function public.reopen_trip_cost_on_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.trip_cost_lines set is_settled=false where id in(select cost_line_id from public.trip_cost_transactions where transaction_id=old.id);
  return old;
end $$;
create trigger transactions_reopen_trip_cost before delete on public.transactions for each row execute function public.reopen_trip_cost_on_delete();
revoke all on function public.reopen_trip_cost_on_delete() from public;

create function public.trip_snapshot(p_project_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare home uuid:=public.current_household_id(); result jsonb; can_lists boolean:=public.has_module_access('shopping_lists','view');
begin
  if not public.has_module_access('projects','view') then raise exception 'Sin acceso a viajes'; end if;
  if not exists(select 1 from public.trip_details where project_id=p_project_id and household_id=home) then return null; end if;
  select jsonb_build_object(
    'project',(select to_jsonb(p) from public.projects p where id=p_project_id and household_id=home),
    'detail',(select to_jsonb(d) from public.trip_details d where project_id=p_project_id and household_id=home),
    'activities',coalesce((select jsonb_agg(a order by date,time nulls last,sort_order) from public.trip_activities a where project_id=p_project_id and household_id=home),'[]'),
    'costLines',coalesce((select jsonb_agg(c order by created_at) from public.trip_cost_lines c where project_id=p_project_id and household_id=home),'[]'),
    'costTransactions',coalesce((select jsonb_agg(c) from public.trip_cost_transactions c where project_id=p_project_id and household_id=home),'[]'),
    'activityItems',case when can_lists then coalesce((select jsonb_agg(a) from public.trip_activity_items a where project_id=p_project_id and household_id=home),'[]') else '[]' end,
    'lists',case when can_lists then coalesce((select jsonb_agg(l order by created_at) from public.shopping_lists l where project_id=p_project_id and household_id=home),'[]') else '[]' end,
    'groups',case when can_lists then coalesce((select jsonb_agg(g) from public.shopping_list_groups g join public.shopping_lists l on l.id=g.list_id where l.project_id=p_project_id and l.household_id=home),'[]') else '[]' end,
    'items',case when can_lists then coalesce((select jsonb_agg(i order by i.sort_order,i.created_at) from public.shopping_list_items i join public.shopping_lists l on l.id=i.list_id where l.project_id=p_project_id and l.household_id=home),'[]') else '[]' end,
    'purchases',case when can_lists then coalesce((select jsonb_agg(p) from public.shopping_list_purchases p join public.shopping_lists l on l.id=p.list_id where l.project_id=p_project_id and l.household_id=home),'[]') else '[]' end,
    'transactions',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'amount',t.amount,'date',t.date,'description',t.description,'status',t.status,'created_by',t.created_by) order by date desc) from public.transactions t where project_id=p_project_id and household_id=home and type='expense' and status='posted'),'[]'),
    'shoppingSummary',(select jsonb_build_object('estimated',coalesce(round(sum(i.quantity*i.estimated_price) filter(where i.resolution='pending'),2),0),
      'pending',coalesce(round(sum(i.quantity*(case when i.checked then coalesce(i.real_price,i.estimated_price) else i.estimated_price end)) filter(where i.purchase_id is null and i.resolution='pending'),2),0),
      'missing',count(*) filter(where i.resolution='pending' and i.estimated_price is null))
      from public.shopping_list_items i join public.shopping_lists l on l.id=i.list_id where l.project_id=p_project_id and l.household_id=home and (l.status<>'archived' or i.purchase_id is not null))
  ) into result;
  return result;
end $$;

revoke all on function public.save_trip(uuid,text,numeric,date,date,text,text,text,text),public.ensure_trip_shopping_list(uuid),public.link_trip_item(uuid,uuid,numeric,text,boolean),public.create_trip_activity_item(uuid,text,numeric,text,numeric),public.link_trip_cost_transaction(uuid,uuid,boolean),public.assign_shopping_list_project(uuid,uuid,boolean),public.trip_snapshot(uuid) from public;
grant execute on function public.save_trip(uuid,text,numeric,date,date,text,text,text,text),public.ensure_trip_shopping_list(uuid),public.link_trip_item(uuid,uuid,numeric,text,boolean),public.create_trip_activity_item(uuid,text,numeric,text,numeric),public.link_trip_cost_transaction(uuid,uuid,boolean),public.assign_shopping_list_project(uuid,uuid,boolean),public.trip_snapshot(uuid) to authenticated;
create function public.touch_trip_planning() returns trigger language plpgsql security definer set search_path='' as $$
declare pid uuid; previous uuid;
begin
  if TG_TABLE_NAME in ('shopping_list_items','shopping_list_groups','shopping_list_purchases') then
    select project_id into pid from public.shopping_lists where id=case when TG_OP='DELETE' then old.list_id else new.list_id end;
  elsif TG_TABLE_NAME='projects' then
    pid:=case when TG_OP='DELETE' then old.id else new.id end;
  else
    pid:=case when TG_OP='DELETE' then old.project_id else new.project_id end;
    if TG_OP='UPDATE' then previous:=old.project_id; end if;
  end if;
  perform 1 from public.projects where id=pid or id=previous order by id for share;
  update public.trip_details set updated_at=now() where project_id=pid or project_id=previous;
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['trip_activities','trip_cost_lines','trip_cost_transactions','trip_activity_items','shopping_list_items','shopping_lists','shopping_list_groups','shopping_list_purchases','transactions','projects'] loop
    execute format('create trigger %I_trip_touch after insert or update or delete on public.%I for each row execute function public.touch_trip_planning()',t,t);
  end loop;
end $$;
revoke all on function public.touch_trip_planning() from public;
create index trip_activity_day_idx on public.trip_activities(project_id,date);
create index trip_required_item_idx on public.trip_activity_items(item_id);
create function public.guard_trip_item_unit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.unit is distinct from old.unit and exists(select 1 from public.trip_activity_items where item_id=old.id) then raise exception 'Quita los vínculos del menú antes de cambiar la unidad'; end if;
  return new;
end $$;
create trigger shopping_items_trip_unit before update on public.shopping_list_items for each row execute function public.guard_trip_item_unit();
create function public.travel_transaction_source(p_transaction_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tx public.transactions; purchase public.shopping_list_purchases; list public.shopping_lists; cost public.trip_cost_lines;
begin
  if not public.has_module_access('transactions','view') then raise exception 'Sin acceso al movimiento'; end if;
  select * into tx from public.transactions where id=p_transaction_id and household_id=public.current_household_id();
  if not found then return null; end if;
  select * into purchase from public.shopping_list_purchases where transaction_id=tx.id and household_id=tx.household_id;
  if found then select * into list from public.shopping_lists where id=purchase.list_id and household_id=tx.household_id; end if;
  select c.* into cost from public.trip_cost_lines c join public.trip_cost_transactions r on r.cost_line_id=c.id where r.transaction_id=tx.id and r.household_id=tx.household_id;
  return jsonb_build_object('purchase',case when purchase.id is not null then jsonb_build_object('id',purchase.id,'list_id',purchase.list_id,'store_name',purchase.store_name) else null end,
    'list',case when list.id is not null then jsonb_build_object('id',list.id,'name',list.name) else null end,
    'project',(select jsonb_build_object('id',p.id,'name',p.name,'is_trip',exists(select 1 from public.trip_details where project_id=p.id)) from public.projects p where p.id=tx.project_id and p.household_id=tx.household_id),
    'cost',case when cost.id is not null then jsonb_build_object('id',cost.id,'name',cost.name) else null end,
    'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.name,'quantity',i.quantity,'unit',i.unit,'real_price',i.real_price) order by i.sort_order) from public.shopping_list_items i where i.purchase_id=purchase.id and i.household_id=tx.household_id),'[]'),
    'activities',case when public.has_module_access('projects','view') then coalesce((select jsonb_agg(distinct jsonb_build_object('title',a.title,'date',a.date)) from public.trip_activities a left join public.trip_activity_items ai on ai.activity_id=a.id left join public.shopping_list_items i on i.id=ai.item_id where (i.purchase_id=purchase.id or a.id=cost.activity_id) and a.household_id=tx.household_id),'[]') else '[]' end);
end $$;
revoke all on function public.travel_transaction_source(uuid) from public;
grant execute on function public.travel_transaction_source(uuid) to authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.trip_details,public.trip_activities,public.trip_cost_lines,public.trip_cost_transactions,public.trip_activity_items;
  end if;
end $$;
