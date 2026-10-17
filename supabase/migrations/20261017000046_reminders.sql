create table public.reminder_categories(
 id uuid primary key default gen_random_uuid(),household_id uuid not null references public.households(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 60),slug text,color text not null check(color~'^#[0-9a-fA-F]{6}$'),
 icon text not null check(icon in('car','paw-print','heart-pulse','graduation-cap','house','notebook-pen')),is_archived boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,household_id),unique(household_id,slug)
);
create table public.reminders(
 id uuid primary key default gen_random_uuid(),household_id uuid not null references public.households(id) on delete cascade,owner_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 120),notes text not null default '' check(length(notes)<=5000),reference text not null default '' check(length(reference)<=80),category_id uuid,
 kind text not null check(kind in('note','once','recurring')),visibility text not null default 'personal' check(visibility in('personal','household')),
 status text not null default 'active' check(status in('active','completed','paused','archived')),previous_status text,
 due_date date, due_time time,anchor_date date,snoozed_until date,repeat_unit text check(repeat_unit in('day','week','month','year')),
 repeat_interval int not null default 1 check(repeat_interval between 1 and 365),repeat_from text not null default 'completion' check(repeat_from in('completion','calendar')),
 current_km numeric(10,1) check(current_km between 0 and 99999999),due_km numeric(10,1) check(due_km between 0 and 99999999),repeat_km numeric(10,1) check(repeat_km>0 and repeat_km<=99999999),
 alert_days int[] not null default '{7,1,0}' check(cardinality(alert_days)<=12 and 0<=all(alert_days) and 365>=all(alert_days)),
 occurrence_id uuid not null default gen_random_uuid(),schedule_revision int not null default 1,create_key uuid not null,create_payload jsonb not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(owner_id,household_id)references public.profiles(id,household_id),foreign key(category_id,household_id)references public.reminder_categories(id,household_id),unique(id,household_id),unique(owner_id,create_key),
 check(kind='note' or due_date is not null or due_km is not null),
 check(kind<>'recurring' or repeat_unit is not null or repeat_km is not null),check(repeat_unit is null or due_date is not null),check(repeat_km is null or due_km is not null),
 check(kind<>'note' or due_date is null and due_km is null and repeat_unit is null and repeat_km is null and cardinality(alert_days)=0),
 check(kind<>'once' or repeat_unit is null and repeat_km is null)
);
create table public.reminder_events(
 id uuid primary key default gen_random_uuid(),household_id uuid not null,reminder_id uuid not null,created_by uuid not null,
 kind text not null check(kind in('completed','snoozed','paused','resumed','archived','restored','reading_corrected')),occurrence_id uuid not null,
 performed_date date,performed_km numeric(10,1),notes text not null default '' check(length(notes)<=5000),skipped_count int not null default 0,
 snapshot jsonb not null,result jsonb,request_key uuid,request_payload jsonb,created_at timestamptz not null default now(),
 foreign key(reminder_id,household_id)references public.reminders(id,household_id)on delete cascade,foreign key(created_by,household_id)references public.profiles(id,household_id),unique(created_by,request_key)
);
create index reminders_due_idx on public.reminders(household_id,status,due_date);
create index reminders_owner_idx on public.reminders(owner_id,status);
create index reminders_reference_idx on public.reminders(household_id,reference);
create index reminder_events_parent_idx on public.reminder_events(reminder_id,created_at desc);

create function public.seed_reminder_categories(p_home uuid)returns void language sql security definer set search_path='' as $$
 insert into public.reminder_categories(household_id,name,slug,color,icon)values
 (p_home,'Vehículos','vehicles','#3b82f6','car'),(p_home,'Mascotas','pets','#f59e0b','paw-print'),(p_home,'Salud','health','#ef4444','heart-pulse'),
 (p_home,'Estudios','study','#8b5cf6','graduation-cap'),(p_home,'Hogar','home','#10b981','house'),(p_home,'Personal','personal','#ec4899','notebook-pen')on conflict(household_id,slug)do nothing;
$$;
revoke all on function public.seed_reminder_categories(uuid)from public;
do $$declare h record;begin for h in select id from public.households loop perform public.seed_reminder_categories(h.id);end loop;end$$;
create function public.new_home_reminder_categories()returns trigger language plpgsql security definer set search_path='' as $$begin perform public.seed_reminder_categories(new.id);return new;end$$;
create trigger households_reminder_categories after insert on public.households for each row execute function public.new_home_reminder_categories();

create function public.can_access_reminder(p_id uuid,p_edit boolean default false)returns boolean language sql stable security definer set search_path='' as $$
 select public.has_module_access('reminders',case when p_edit then 'edit'::public.permission_level else 'view'::public.permission_level end)and exists(select 1 from public.reminders r where r.id=p_id and r.household_id=public.current_household_id()and(r.owner_id=auth.uid()or r.visibility='household'));
$$;
revoke all on function public.can_access_reminder(uuid,boolean)from public;grant execute on function public.can_access_reminder(uuid,boolean)to authenticated;
alter table public.reminders enable row level security;alter table public.reminder_events enable row level security;alter table public.reminder_categories enable row level security;
create policy reminders_read on public.reminders for select to authenticated using(public.can_access_reminder(id));
create policy reminder_events_read on public.reminder_events for select to authenticated using(public.can_access_reminder(reminder_id));
create policy reminder_categories_read on public.reminder_categories for select to authenticated using(household_id=public.current_household_id()and public.has_module_access('reminders','view'));
create policy reminder_categories_insert on public.reminder_categories for insert to authenticated with check(household_id=public.current_household_id()and public.has_module_access('reminders','edit')and slug is null);
create policy reminder_categories_update on public.reminder_categories for update to authenticated using(household_id=public.current_household_id()and public.has_module_access('reminders','edit'))with check(household_id=public.current_household_id()and public.has_module_access('reminders','edit'));
grant select on public.reminders,public.reminder_events to authenticated;grant select,insert,update(name,color,icon,is_archived)on public.reminder_categories to authenticated;
create trigger reminders_touch before update on public.reminders for each row execute function public.set_updated_at();
create trigger reminder_categories_touch before update on public.reminder_categories for each row execute function public.set_updated_at();

create function public.reminder_next_date(p_current date,p_anchor date,p_unit text,p_interval int)returns date language plpgsql immutable set search_path='' as $$
declare target date;daynum int;begin
 if p_interval not between 1 and 365 then raise exception 'Intervalo inválido';end if;
 if p_unit='day' then return p_current+p_interval;elsif p_unit='week' then return p_current+7*p_interval;end if;
 if p_unit='month' then target:=(date_trunc('month',p_current)+make_interval(months=>p_interval))::date;
 elsif p_unit='year' then target:=make_date(extract(year from p_current)::int+p_interval,extract(month from p_anchor)::int,1);else raise exception 'Repetición inválida';end if;
 daynum:=least(extract(day from p_anchor)::int,extract(day from(target+interval '1 month'-interval '1 day'))::int);
 return target+daynum-1;end$$;

create function public.complete_reminder(p_id uuid,p_occurrence_id uuid,p_input jsonb,p_request_key uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.reminders;e public.reminder_events;v_result jsonb;performed date;km numeric;today date;nextday date;nextkm numeric;anchor date;skipped int:=0;eid uuid;
begin
 if not public.can_access_reminder(p_id,true)then raise exception 'Sin permiso o recordatorio no disponible';end if;
 select * into r from public.reminders where id=p_id for update;
 select * into e from public.reminder_events where created_by=auth.uid()and request_key=p_request_key;
 if found then if e.reminder_id<>p_id or e.occurrence_id<>p_occurrence_id or e.request_payload is distinct from p_input then raise exception 'La petición ya se usó para otra operación';end if;return e.result;end if;
 if r.occurrence_id<>p_occurrence_id or r.status<>'active' or r.kind='note' then raise exception 'Esta ocasión ya no está pendiente; actualiza la pantalla';end if;
 select (now()at time zone h.timezone)::date into today from public.households h where h.id=r.household_id;
 performed:=(p_input->>'performed_date')::date;km:=nullif(p_input->>'performed_km','')::numeric;
 if performed is null or performed>today or extract(year from performed)not between 1900 and 9999 then raise exception 'Fecha de realización inválida';end if;
 if km is not null and(km<0 or km>99999999 or km<>round(km,1))then raise exception 'Kilometraje inválido';end if;
 if r.repeat_km is not null and km is null then raise exception 'Indica el kilometraje de realización';end if;
 if r.current_km is not null and km<r.current_km and coalesce((p_input->>'confirm_reading_correction')::boolean,false)=false then raise exception 'Confirma la corrección del kilometraje';end if;
 if r.kind='recurring' then
  if r.repeat_unit is not null then anchor:=case when r.repeat_from='completion'then performed else r.anchor_date end;
   nextday:=public.reminder_next_date(case when r.repeat_from='completion'then performed else r.due_date end,anchor,r.repeat_unit,r.repeat_interval);
   if r.repeat_from='calendar' then while nextday<=greatest(today,performed)loop nextday:=public.reminder_next_date(nextday,anchor,r.repeat_unit,r.repeat_interval);skipped:=skipped+1;end loop;end if;
  end if;
  if r.repeat_km is not null then nextkm:=km+r.repeat_km;end if;
 end if;
 insert into public.reminder_events(household_id,reminder_id,created_by,kind,occurrence_id,performed_date,performed_km,notes,skipped_count,snapshot,request_key,request_payload)
 values(r.household_id,r.id,auth.uid(),'completed',r.occurrence_id,performed,km,coalesce(p_input->>'notes',''),skipped,to_jsonb(r),p_request_key,p_input)returning id into eid;
 update public.reminders set status=case when r.kind='recurring'then 'active'else 'completed'end,due_date=case when r.kind='recurring'then nextday else due_date end,due_km=case when r.kind='recurring'then nextkm else due_km end,
 current_km=coalesce(km,current_km),anchor_date=case when r.kind='recurring'then anchor else anchor_date end,snoozed_until=null,occurrence_id=gen_random_uuid(),schedule_revision=schedule_revision+1 where id=r.id;
 select to_jsonb(x)into v_result from public.reminders x where id=r.id;
 update public.reminder_events ev set result=v_result where ev.id=eid;return v_result;
end$$;

create function public.save_reminder(p_input jsonb,p_request_key uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.reminders;existing public.reminders;rid uuid;home uuid:=public.current_household_id();v_kind text:=p_input->>'kind';v text:=coalesce(p_input->>'visibility','personal');alerts int[];result jsonb;
begin
 if not public.has_module_access('reminders','edit')or home is null then raise exception 'Sin permiso para editar recordatorios';end if;
 if v_kind not in('note','once','recurring')or v not in('personal','household')then raise exception 'Tipo o privacidad inválidos';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_key::text,0));
 rid:=nullif(p_input->>'id','')::uuid;
 if rid is null then select * into existing from public.reminders where owner_id=auth.uid()and create_key=p_request_key;
  if found then if existing.create_payload is distinct from p_input then raise exception 'La petición ya se usó para otro registro';end if;return to_jsonb(existing);end if;
 else
  if not public.can_access_reminder(rid,true)then raise exception 'Sin permiso para editar este recordatorio';end if;
  select * into r from public.reminders where id=rid for update;
  if r.visibility<>v and r.owner_id<>auth.uid()then raise exception 'Solo el propietario puede cambiar la privacidad';end if;
 end if;
 select coalesce(array_agg(distinct value::int order by value::int desc),'{}')into alerts from jsonb_array_elements_text(coalesce(p_input->'alert_days','[7,1,0]'::jsonb));
 if nullif(p_input->>'category_id','')is not null and not exists(select 1 from public.reminder_categories where id=(p_input->>'category_id')::uuid and household_id=home and(not is_archived or id=r.category_id))then raise exception 'Categoría no disponible';end if;
 if r.id is not null and r.current_km is not null and nullif(p_input->>'current_km','')::numeric<r.current_km and coalesce((p_input->>'confirm_reading_correction')::boolean,false)=false then raise exception 'Confirma la corrección del kilometraje';end if;
 if rid is null then rid:=gen_random_uuid();insert into public.reminders(id,household_id,owner_id,title,kind,visibility,due_date,alert_days,create_key,create_payload)values(rid,home,auth.uid(),p_input->>'title','note',v,null,'{}',p_request_key,p_input);end if;
 update public.reminders set title=trim(p_input->>'title'),notes=coalesce(p_input->>'notes',''),reference=trim(coalesce(p_input->>'reference','')),kind=v_kind,visibility=v,category_id=nullif(p_input->>'category_id','')::uuid,
 due_date=case when v_kind='note'then null else nullif(p_input->>'due_date','')::date end,due_time=case when v_kind='note'then null else nullif(p_input->>'due_time','')::time end,
 snoozed_until=case when v_kind='note'or r.due_date is distinct from nullif(p_input->>'due_date','')::date then null else r.snoozed_until end,
 anchor_date=case when v_kind='note'then null when r.due_date is not distinct from nullif(p_input->>'due_date','')::date then r.anchor_date else nullif(p_input->>'due_date','')::date end,
 current_km=case when v_kind='note'then null else nullif(p_input->>'current_km','')::numeric end,due_km=case when v_kind='note'then null else nullif(p_input->>'due_km','')::numeric end,
 repeat_km=case when v_kind='recurring'then nullif(p_input->>'repeat_km','')::numeric else null end,repeat_unit=case when v_kind='recurring'then nullif(p_input->>'repeat_unit','')else null end,
 repeat_interval=coalesce(nullif(p_input->>'repeat_interval','')::int,1),repeat_from=coalesce(p_input->>'repeat_from','completion'),alert_days=case when v_kind='note'then '{}'::int[]else alerts end where id=rid;
 select to_jsonb(x)into result from public.reminders x where id=rid;
 if r.id is null and nullif(p_input->>'performed_date','')is not null and v_kind<>'note'then return public.complete_reminder(rid,(result->>'occurrence_id')::uuid,jsonb_build_object('performed_date',p_input->>'performed_date','performed_km',p_input->>'performed_km','notes',coalesce(p_input->>'performed_notes','')),p_request_key);end if;
 return result;
end$$;

create function public.reminder_revision_guard()returns trigger language plpgsql set search_path='' as $$begin
 if(new.due_date,new.due_time,new.snoozed_until,new.due_km,new.current_km,new.repeat_unit,new.repeat_interval,new.repeat_from,new.repeat_km,new.alert_days,new.visibility,new.status,new.kind)
 is distinct from(old.due_date,old.due_time,old.snoozed_until,old.due_km,old.current_km,old.repeat_unit,old.repeat_interval,old.repeat_from,old.repeat_km,old.alert_days,old.visibility,old.status,old.kind)then new.schedule_revision:=old.schedule_revision+1;end if;return new;
end$$;
create trigger reminders_revision before update on public.reminders for each row execute function public.reminder_revision_guard();
create function public.reminder_operation(p_id uuid,p_operation text,p_input jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.reminders;newstatus text;begin
 if not public.can_access_reminder(p_id,true)then raise exception 'Sin permiso o recordatorio no disponible';end if;
 select * into r from public.reminders where id=p_id for update;
 if p_operation='archive'and r.status='archived'then return to_jsonb(r);end if;
 if p_operation='snooze'then if r.status<>'active'or r.kind='note'then raise exception 'No se puede posponer este registro';end if;
  if nullif(p_input->>'date','')::date is null then raise exception 'Indica la nueva fecha';end if;
  update public.reminders set snoozed_until=(p_input->>'date')::date where id=r.id;
 elsif p_operation in('pause','resume','archive','restore')then
  newstatus:=case p_operation when 'pause'then 'paused'when 'resume'then 'active'when 'archive'then 'archived'else coalesce(r.previous_status,'active')end;
  if p_operation='restore'and r.status<>'archived'or p_operation='resume'and r.status<>'paused'or p_operation='pause'and r.status<>'active'then raise exception 'Actualiza el estado del registro';end if;
  update public.reminders set previous_status=case when p_operation='archive'then r.status else previous_status end,status=newstatus where id=r.id;
 else raise exception 'Operación inválida';end if;
 insert into public.reminder_events(household_id,reminder_id,created_by,kind,occurrence_id,snapshot)values(r.household_id,r.id,auth.uid(),case p_operation when 'snooze'then 'snoozed'when 'pause'then 'paused'when 'resume'then 'resumed'when 'archive'then 'archived'else 'restored'end,r.occurrence_id,to_jsonb(r));
 return(select to_jsonb(x)from public.reminders x where id=r.id);
end$$;
create function public.reminder_snapshot(p_id uuid)returns jsonb language sql stable security definer set search_path='' as $$
 select case when public.can_access_reminder(p_id)then jsonb_build_object('reminder',to_jsonb(r)-'create_payload'-'create_key','events',coalesce((select jsonb_agg(to_jsonb(e)-'result'-'request_payload'-'request_key'order by e.created_at desc)from public.reminder_events e where e.reminder_id=r.id),'[]'))else null end from public.reminders r where id=p_id;
$$;
revoke all on function public.save_reminder(jsonb,uuid),public.complete_reminder(uuid,uuid,jsonb,uuid),public.reminder_operation(uuid,text,jsonb),public.reminder_snapshot(uuid)from public;
grant execute on function public.save_reminder(jsonb,uuid),public.complete_reminder(uuid,uuid,jsonb,uuid),public.reminder_operation(uuid,text,jsonb),public.reminder_snapshot(uuid)to authenticated;

