create table public.reminder_preferences(
 user_id uuid primary key,household_id uuid not null,shared_enabled boolean not null default true,push_enabled boolean not null default false,last_test_at timestamptz,
 foreign key(user_id,household_id)references public.profiles(id,household_id)on delete cascade
);
create table public.user_notifications(
 id uuid primary key default gen_random_uuid(),household_id uuid not null,user_id uuid not null,reminder_id uuid not null,schedule_revision int not null,
 condition_key text not null,message text not null,is_active boolean not null default true,read_at timestamptz,created_at timestamptz not null default now(),
 foreign key(user_id,household_id)references public.profiles(id,household_id)on delete cascade,
 foreign key(reminder_id,household_id)references public.reminders(id,household_id)on delete cascade,unique(reminder_id,schedule_revision,user_id,condition_key)
);
create table public.push_subscriptions(
 id uuid primary key default gen_random_uuid(),household_id uuid not null,user_id uuid not null,endpoint text not null unique,keys jsonb not null,
 device_token_hash text not null unique,device_name text not null default 'Este dispositivo',is_active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(user_id,household_id)references public.profiles(id,household_id)on delete cascade
);
create table public.notification_deliveries(
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.user_notifications(id)on delete cascade,subscription_id uuid not null references public.push_subscriptions(id)on delete cascade,
 status text not null default 'pending'check(status in('pending','sending','sent','retry','cancelled','failed')),attempts int not null default 0,
 lease_until timestamptz,lease_token uuid,next_attempt_at timestamptz not null default now(),sent_at timestamptz,last_error text,
 unique(notification_id,subscription_id)
);
create index notifications_user_idx on public.user_notifications(user_id,is_active,created_at desc);
create index notification_pending_idx on public.notification_deliveries(status,next_attempt_at);
create function public.reminder_recipient_can_access(p_id uuid,p_user uuid)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.reminders r join public.profiles u on u.household_id=r.household_id where r.id=p_id and u.id=p_user and(r.visibility='household'or r.owner_id=u.id)and(u.role='admin'or exists(select 1 from public.module_permissions mp where mp.user_id=u.id and mp.module='reminders'and mp.level in('view','edit'))));
$$;
revoke all on function public.reminder_recipient_can_access(uuid,uuid)from public;
do $$declare t text;begin foreach t in array array['reminder_preferences','user_notifications','push_subscriptions','notification_deliveries']loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
create policy notifications_self on public.user_notifications for select to authenticated using(user_id=auth.uid()and public.can_access_reminder(reminder_id)and is_active);
create policy preferences_self on public.reminder_preferences for select to authenticated using(user_id=auth.uid()and household_id=public.current_household_id());
create policy preferences_insert on public.reminder_preferences for insert to authenticated with check(user_id=auth.uid()and household_id=public.current_household_id()and public.has_module_access('reminders','view'));
create policy preferences_update on public.reminder_preferences for update to authenticated using(user_id=auth.uid()and household_id=public.current_household_id())with check(user_id=auth.uid()and household_id=public.current_household_id());
create policy push_self on public.push_subscriptions for select to authenticated using(user_id=auth.uid()and household_id=public.current_household_id());
grant select on public.user_notifications,public.push_subscriptions,public.reminder_preferences to authenticated;
grant insert(user_id,household_id,shared_enabled,push_enabled),update(shared_enabled,push_enabled)on public.reminder_preferences to authenticated;
grant all on public.user_notifications,public.reminder_preferences,public.push_subscriptions,public.notification_deliveries to service_role;

create function public.reminder_notification_condition(p_id uuid,p_today date)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.reminders;days int;offset_days int;begin
 select * into r from public.reminders where id=p_id;
 if not found or r.kind='note'or r.status<>'active'or cardinality(r.alert_days)=0 then return null;end if;
 if r.due_km is not null and r.current_km>=r.due_km then return jsonb_build_object('key','mileage','message','Un recordatorio alcanzó el kilometraje previsto.');end if;
 if r.effective_date is null then return null;end if;days:=r.effective_date-p_today;
 if days<0 then return jsonb_build_object('key','overdue','message','Tienes un recordatorio pendiente por revisar.');end if;
 select min(v)into offset_days from unnest(r.alert_days)v where v>=days;if offset_days is null then return null;end if;
 return jsonb_build_object('key',case when days=0 and offset_days=0 then 'due'else 'advance:'||offset_days end,'message',case when days=0 and offset_days=0 then 'Tienes un recordatorio para hoy.'else 'Se acerca la fecha de un recordatorio.'end);
end$$;
revoke all on function public.reminder_notification_condition(uuid,date)from public;
create function public.prepare_reminder_notifications(p_now timestamptz default now())returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;u record;condition jsonb;created int:=0;notice uuid;begin
 for r in select x.*,h.timezone from public.reminders x join public.households h on h.id=x.household_id where x.status='active'and x.kind<>'note'loop
  condition:=public.reminder_notification_condition(r.id,(p_now at time zone r.timezone)::date);if condition is null then continue;end if;
  for u in select p.id,coalesce(f.push_enabled,false)push_enabled from public.profiles p left join public.reminder_preferences f on f.user_id=p.id where p.household_id=r.household_id and public.reminder_recipient_can_access(r.id,p.id)and(p.id=r.owner_id or coalesce(f.shared_enabled,true))loop
   insert into public.user_notifications(household_id,user_id,reminder_id,schedule_revision,condition_key,message)values(r.household_id,u.id,r.id,r.schedule_revision,condition->>'key',condition->>'message')on conflict do nothing returning id into notice;
   if found then created:=created+1;else select id into notice from public.user_notifications where reminder_id=r.id and schedule_revision=r.schedule_revision and user_id=u.id and condition_key=condition->>'key';end if;
   if u.push_enabled then insert into public.notification_deliveries(notification_id,subscription_id,next_attempt_at)select notice,s.id,p_now from public.push_subscriptions s where s.user_id=u.id and s.is_active on conflict do nothing;end if;
  end loop;
 end loop;return jsonb_build_object('created',created);
end$$;
revoke all on function public.prepare_reminder_notifications(timestamptz)from public;grant execute on function public.prepare_reminder_notifications(timestamptz)to service_role;

create function public.refresh_my_reminder_notifications()returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;condition jsonb;today date;created int:=0;begin
 if not public.has_module_access('reminders','view')then raise exception 'Sin permiso';end if;
 select(now()at time zone h.timezone)::date into today from public.households h where h.id=public.current_household_id();
 for r in select * from public.reminders where household_id=public.current_household_id()and public.can_access_reminder(id)and(owner_id=auth.uid()or not exists(select 1 from public.reminder_preferences where user_id=auth.uid()and not shared_enabled))loop
  condition:=public.reminder_notification_condition(r.id,today);if condition is null then continue;end if;
  insert into public.user_notifications(household_id,user_id,reminder_id,schedule_revision,condition_key,message)values(r.household_id,auth.uid(),r.id,r.schedule_revision,condition->>'key',condition->>'message')on conflict do nothing;if found then created:=created+1;end if;
 end loop;return jsonb_build_object('created',created);
end$$;
revoke all on function public.refresh_my_reminder_notifications()from public;grant execute on function public.refresh_my_reminder_notifications()to authenticated;

create function public.invalidate_reminder_notices()returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.schedule_revision<>old.schedule_revision then
 update public.user_notifications set is_active=false where reminder_id=new.id and schedule_revision<>new.schedule_revision;
 update public.notification_deliveries d set status='cancelled',lease_token=null,lease_until=null from public.user_notifications n where d.notification_id=n.id and n.reminder_id=new.id and not n.is_active and d.status in('pending','sending','retry');end if;return new;
end$$;
create trigger reminders_invalidate_notices after update on public.reminders for each row execute function public.invalidate_reminder_notices();

create function public.claim_notification_deliveries(p_limit int,p_now timestamptz default now())returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 update public.notification_deliveries d set status='cancelled',lease_token=null,lease_until=null from public.user_notifications n,public.reminders r,public.push_subscriptions s where d.notification_id=n.id and n.reminder_id=r.id and d.subscription_id=s.id and d.status in('pending','retry','sending')and(not n.is_active or n.schedule_revision<>r.schedule_revision or not public.reminder_recipient_can_access(r.id,n.user_id)or r.status<>'active'or not s.is_active or not exists(select 1 from public.reminder_preferences f where f.user_id=n.user_id and f.push_enabled and(n.user_id=r.owner_id or f.shared_enabled)));
 with picked as(select d.id from public.notification_deliveries d where attempts<5 and next_attempt_at<=p_now and(status in('pending','retry')or status='sending'and lease_until<p_now)order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,1),50)),claimed as(update public.notification_deliveries d set status='sending',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=p_now+interval '5 minutes' from picked where d.id=picked.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease_token',c.lease_token,'notification_id',n.id,'reminder_id',n.reminder_id,'message',n.message,'subscription_id',s.id,'endpoint',s.endpoint,'keys',s.keys,'attempts',c.attempts)),'[]')into result from claimed c join public.user_notifications n on n.id=c.notification_id join public.push_subscriptions s on s.id=c.subscription_id;return result;
end$$;
revoke all on function public.claim_notification_deliveries(int,timestamptz)from public;grant execute on function public.claim_notification_deliveries(int,timestamptz)to service_role;

create function public.validate_notification_delivery(p_id uuid,p_lease_token uuid)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.notification_deliveries d join public.user_notifications n on n.id=d.notification_id join public.reminders r on r.id=n.reminder_id join public.push_subscriptions s on s.id=d.subscription_id join public.reminder_preferences f on f.user_id=n.user_id where d.id=p_id and d.lease_token=p_lease_token and d.status='sending'and d.lease_until>now()and n.is_active and r.status='active'and r.schedule_revision=n.schedule_revision and s.is_active and s.user_id=n.user_id and f.push_enabled and(r.owner_id=n.user_id or f.shared_enabled)and public.reminder_recipient_can_access(r.id,n.user_id));
$$;
revoke all on function public.validate_notification_delivery(uuid,uuid)from public;grant execute on function public.validate_notification_delivery(uuid,uuid)to service_role;
create function public.mark_notifications_read(p_id uuid default null)returns void language sql security definer set search_path='' as $$
 update public.user_notifications n set read_at=now()where n.user_id=auth.uid()and n.is_active and public.can_access_reminder(n.reminder_id)and(p_id is null or n.id=p_id)and read_at is null;
$$;
revoke all on function public.mark_notifications_read(uuid)from public;grant execute on function public.mark_notifications_read(uuid)to authenticated;
revoke insert,update on public.reminder_preferences from authenticated;
create function public.set_reminder_preferences(p_shared boolean,p_push boolean)returns void language plpgsql security definer set search_path='' as $$begin
 if not public.has_module_access('reminders','view')then raise exception 'Sin permiso';end if;
 insert into public.reminder_preferences(user_id,household_id,shared_enabled,push_enabled)values(auth.uid(),public.current_household_id(),p_shared,p_push)on conflict(user_id)do update set shared_enabled=excluded.shared_enabled,push_enabled=excluded.push_enabled;
 if not p_shared then update public.user_notifications n set is_active=false from public.reminders r where n.reminder_id=r.id and n.user_id=auth.uid()and r.owner_id<>auth.uid();end if;
 update public.notification_deliveries d set status='cancelled',lease_token=null,lease_until=null from public.user_notifications n where d.notification_id=n.id and n.user_id=auth.uid()and d.status in('pending','retry','sending')and(not p_push or not n.is_active);
end$$;
revoke all on function public.set_reminder_preferences(boolean,boolean)from public;grant execute on function public.set_reminder_preferences(boolean,boolean)to authenticated;
create function public.register_push_subscription(p_endpoint text,p_keys jsonb,p_device_hash text,p_name text)returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.push_subscriptions;sid uuid;begin
 if not public.has_module_access('reminders','view')then raise exception 'Sin permiso para activar avisos';end if;
 if length(p_endpoint)>4096 or p_endpoint!~'^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)(:443)?/'or p_device_hash!~'^[a-f0-9]{64}$'or coalesce(p_keys->>'p256dh','')!~'^[A-Za-z0-9_-]{87}$'or coalesce(p_keys->>'auth','')!~'^[A-Za-z0-9_-]{22}$'then raise exception 'Suscripción inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_endpoint,0));
 select * into existing from public.push_subscriptions where endpoint=p_endpoint for update;
 if found and existing.user_id<>auth.uid()then raise exception 'Este navegador tiene una suscripción de otra cuenta. Restablece la suscripción en este dispositivo.';end if;
 if exists(select 1 from public.push_subscriptions where device_token_hash=p_device_hash and user_id<>auth.uid())then raise exception 'El dispositivo pertenece a otra cuenta; restablece su suscripción';end if;
 update public.push_subscriptions set is_active=false,device_token_hash=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')where user_id=auth.uid()and device_token_hash=p_device_hash and endpoint<>p_endpoint;
 insert into public.push_subscriptions(household_id,user_id,endpoint,keys,device_token_hash,device_name)values(public.current_household_id(),auth.uid(),p_endpoint,p_keys,p_device_hash,left(p_name,80))on conflict(endpoint)do update set keys=excluded.keys,device_token_hash=excluded.device_token_hash,is_active=true,updated_at=now()returning id into sid;
 insert into public.reminder_preferences(user_id,household_id,push_enabled)values(auth.uid(),public.current_household_id(),true)on conflict(user_id)do update set push_enabled=true;
 return sid;
end$$;
revoke all on function public.register_push_subscription(text,jsonb,text,text)from public;grant execute on function public.register_push_subscription(text,jsonb,text,text)to authenticated;
create function public.claim_test_push(p_device_hash text)returns jsonb language plpgsql security definer set search_path='' as $$
declare sub public.push_subscriptions;begin
 if not public.has_module_access('reminders','view')then raise exception 'Sin permiso';end if;
 select * into sub from public.push_subscriptions where user_id=auth.uid()and device_token_hash=p_device_hash and is_active;
 if not found then raise exception 'Activa este dispositivo primero';end if;
 update public.reminder_preferences set last_test_at=now()where user_id=auth.uid()and(last_test_at is null or last_test_at<now()-interval '1 minute');
 if not found then raise exception 'Espera un minuto antes de enviar otra prueba';end if;
 return jsonb_build_object('endpoint',sub.endpoint,'keys',sub.keys);
end$$;
revoke all on function public.claim_test_push(text)from public;grant execute on function public.claim_test_push(text)to authenticated;

