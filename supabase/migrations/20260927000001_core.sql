-- Núcleo: hogar y perfiles. Permisos por módulo llegan en la Fase 1.

create type public.app_role as enum ('admin', 'member');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  currency char(3) not null default 'USD',
  timezone text not null default 'America/Panama',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 80),
  avatar_url text,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_household_id_idx on public.profiles (household_id);
-- App de un solo hogar: un único admin. También bloquea carreras en /setup.
create unique index profiles_single_admin on public.profiles ((true)) where role = 'admin';

create trigger households_updated_at before update on public.households
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Helpers para RLS (security definer evita recursión en políticas de profiles).
create or replace function public.current_household_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.profiles where id = (select auth.uid())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false)
$$;

alter table public.households enable row level security;
alter table public.profiles enable row level security;

create policy "miembros ven su hogar" on public.households
  for select to authenticated using (id = public.current_household_id());
create policy "admin edita su hogar" on public.households
  for update to authenticated using (id = public.current_household_id() and public.is_admin());

create policy "miembros ven perfiles del hogar" on public.profiles
  for select to authenticated using (household_id = public.current_household_id());
create policy "cada quien edita su perfil" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));
-- Altas de hogar/perfiles solo vía service role (/setup y Configuración → Miembros).
