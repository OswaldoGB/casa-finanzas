import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
export const ids = {
  home: "10000000-0000-4000-8000-000000000001",
  other: "10000000-0000-4000-8000-000000000002",
  admin: "20000000-0000-4000-8000-000000000001",
  member: "20000000-0000-4000-8000-000000000002",
  outsider: "20000000-0000-4000-8000-000000000003",
};
export async function createReminderDatabase() {
  const db = new PGlite();
  await db.exec(`create role authenticated;create role service_role bypassrls;create schema auth;
 create type module_name as enum('transactions');create type permission_level as enum('none','view','edit');
 create table households(id uuid primary key,timezone text not null default 'America/El_Salvador');
 create table profiles(id uuid primary key,household_id uuid references households(id),role text,unique(id,household_id));
 create table module_permissions(user_id uuid,module module_name,level permission_level,primary key(user_id,module));
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.user',true),'')::uuid$$;
 create function current_household_id() returns uuid language sql stable security definer set search_path='' as $$select household_id from public.profiles where id=auth.uid()$$;
 create function has_module_access(requested_module module_name,required_level permission_level) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles p where p.id=auth.uid() and (p.role='admin' or exists(select 1 from public.module_permissions mp where mp.user_id=p.id and mp.module=requested_module and (mp.level='edit' or required_level='view' and mp.level='view'))))$$;
 create function set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
 insert into households(id)values('${ids.home}'),('${ids.other}');insert into profiles values('${ids.admin}','${ids.home}','admin'),('${ids.member}','${ids.home}','member'),('${ids.outsider}','${ids.other}','admin');
 select set_config('app.user','${ids.admin}',false);`);
  await db.exec(
    await readFile(
      "supabase/migrations/20261017000045_reminders_module.sql",
      "utf8",
    ),
  );
  await db.exec(
    await readFile("supabase/migrations/20261017000046_reminders.sql", "utf8"),
  );
  await db.exec(
    "grant usage on schema public,auth to authenticated;grant select on profiles,households,module_permissions to authenticated",
  );
  return db;
}
