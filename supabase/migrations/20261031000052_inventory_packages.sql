create table public.inventory_packages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  item_id uuid not null,
  label text not null check(length(trim(label)) between 1 and 60),
  group_name text not null default '' check(length(group_name) <= 60),
  group_id uuid,
  capacity numeric(10,3) not null check(capacity > 0),
  remaining numeric(10,3) not null check(remaining >= 0 and remaining <= capacity),
  is_open boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key(item_id,household_id) references public.inventory_items(id,household_id) on delete cascade
);
create table public.inventory_package_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  item_id uuid not null,
  package_id uuid not null references public.inventory_packages(id) on delete cascade,
  actor_id uuid not null,
  kind text not null check(kind in ('added','open','consume','correct')),
  before_amount numeric(10,3) not null,
  after_amount numeric(10,3) not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key(item_id,household_id) references public.inventory_items(id,household_id) on delete cascade
);
-- Las cantidades antiguas se conservan como una existencia individual en uso.
insert into public.inventory_packages(household_id,item_id,label,capacity,remaining,is_open)
select household_id,id,'Existencia registrada',quantity,quantity,true from public.inventory_items;
insert into public.inventory_package_events(household_id,item_id,package_id,actor_id,kind,before_amount,after_amount,note)
select p.household_id,p.item_id,p.id,i.created_by,'added',0,p.remaining,'Existencia anterior al nuevo inventario'
from public.inventory_packages p join public.inventory_items i on i.id=p.item_id;

alter table public.inventory_items add column low_stock_threshold integer check(low_stock_threshold >= 0);
alter table public.inventory_packages enable row level security;
alter table public.inventory_package_events enable row level security;
create policy inventory_packages_read on public.inventory_packages for select to authenticated using (household_id=public.current_household_id() and public.has_module_access('inventory','view'));
create policy inventory_package_events_read on public.inventory_package_events for select to authenticated using (household_id=public.current_household_id() and public.has_module_access('inventory','view'));
grant select on public.inventory_packages,public.inventory_package_events to authenticated;

create function public.inventory_add_packages(p_item uuid,p_label text,p_count integer,p_capacity integer,p_group_name text default '') returns void language plpgsql security definer set search_path='' as $$
declare v_house uuid; v_id uuid; v_group uuid; i integer;
begin
  if auth.uid() is null or not public.has_module_access('inventory','edit') then raise exception 'Sin permiso'; end if;
  v_house := public.current_household_id();
  perform 1 from public.inventory_items where id=p_item and household_id=v_house for update;
  if not found or length(trim(coalesce(p_label,''))) not between 1 and 60 or p_count not between 1 and 1000 or p_capacity not between 1 and 1000000 then raise exception 'Datos inválidos'; end if;
  if length(trim(coalesce(p_group_name,''))) > 60 then raise exception 'Nombre inválido'; end if;
  v_group := case when length(trim(coalesce(p_group_name,''))) > 0 then gen_random_uuid() else null end;
  for i in 1..p_count loop
    insert into public.inventory_packages(household_id,item_id,label,capacity,remaining,group_name,group_id) values(v_house,p_item,trim(p_label),p_capacity,p_capacity,trim(coalesce(p_group_name,'')),v_group) returning id into v_id;
    insert into public.inventory_package_events(household_id,item_id,package_id,actor_id,kind,before_amount,after_amount) values(v_house,p_item,v_id,auth.uid(),'added',0,p_capacity);
  end loop;
end $$;
create function public.inventory_package_change(p_package uuid,p_action text,p_amount numeric,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare v public.inventory_packages; v_after numeric(10,3);
begin
  if auth.uid() is null or not public.has_module_access('inventory','edit') then raise exception 'Sin permiso'; end if;
  select * into v from public.inventory_packages where id=p_package and household_id=public.current_household_id() for update;
  if not found then raise exception 'Envase no encontrado'; end if;
  if length(coalesce(p_note,'')) > 500 then raise exception 'Nota demasiado larga'; end if;
  if p_action='open' then
    if v.is_open or v.remaining=0 then raise exception 'No se puede abrir'; end if;
    v_after := v.remaining;
    update public.inventory_packages set is_open=true where id=v.id;
  elsif p_action='consume' then
    if not v.is_open or p_amount is null or p_amount <= 0 or p_amount > v.remaining or p_amount <> round(p_amount,3) then raise exception 'Cantidad inválida'; end if;
    v_after := v.remaining-p_amount;
    update public.inventory_packages set remaining=v_after where id=v.id;
  elsif p_action='correct' then
    if p_amount is null or p_amount < 0 or p_amount > v.capacity or p_amount <> round(p_amount,3) or length(trim(coalesce(p_note,'')))=0 then raise exception 'Corrección inválida'; end if;
    v_after := p_amount;
    update public.inventory_packages set remaining=v_after where id=v.id;
  else raise exception 'Operación inválida'; end if;
  insert into public.inventory_package_events(household_id,item_id,package_id,actor_id,kind,before_amount,after_amount,note) values(v.household_id,v.item_id,v.id,auth.uid(),p_action,v.remaining,v_after,coalesce(p_note,''));
end $$;
revoke all on function public.inventory_add_packages(uuid,text,integer,integer,text) from public;
revoke all on function public.inventory_package_change(uuid,text,numeric,text) from public;
grant execute on function public.inventory_add_packages(uuid,text,integer,integer,text), public.inventory_package_change(uuid,text,numeric,text) to authenticated;

create function public.inventory_set_threshold(p_item uuid,p_threshold integer) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.has_module_access('inventory','edit') then raise exception 'Sin permiso'; end if;
  if p_threshold is not null and (p_threshold < 0 or p_threshold > 1000000) then raise exception 'Mínimo inválido'; end if;
  update public.inventory_items set low_stock_threshold=p_threshold where id=p_item and household_id=public.current_household_id();
  if not found then raise exception 'Artículo no encontrado'; end if;
end $$;
revoke all on function public.inventory_set_threshold(uuid,integer) from public;
grant execute on function public.inventory_set_threshold(uuid,integer) to authenticated;

-- Cada artículo nuevo inicia con la cantidad indicada al crearlo.
create function public.inventory_initial_stock() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  insert into public.inventory_packages(household_id,item_id,label,capacity,remaining,is_open) values(new.household_id,new.id,'Existencia inicial',new.quantity,new.quantity,true) returning id into v_id;
  insert into public.inventory_package_events(household_id,item_id,package_id,actor_id,kind,before_amount,after_amount,note) values(new.household_id,new.id,v_id,new.created_by,'added',0,new.quantity,'Existencia inicial');
  return new;
end $$;
revoke all on function public.inventory_initial_stock() from public;
create trigger inventory_initial_stock after insert on public.inventory_items for each row execute function public.inventory_initial_stock();

create function public.inventory_guard_legacy_quantity() returns trigger language plpgsql set search_path='' as $$
begin
  if new.quantity is distinct from old.quantity then raise exception 'Ajusta las existencias desde el inventario'; end if;
  return new;
end $$;
create trigger inventory_guard_legacy_quantity before update on public.inventory_items for each row execute function public.inventory_guard_legacy_quantity();
