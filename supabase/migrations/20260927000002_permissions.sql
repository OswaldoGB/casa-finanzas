-- Fase 1: permisos definidos por el administrador; sin asignación = sin acceso.
create type public.module_name as enum (
  'dashboard', 'accounts', 'transactions', 'budgets', 'projections', 'reports',
  'inventory', 'shopping', 'shopping_lists', 'projects', 'loans', 'savings'
);
create type public.permission_level as enum ('none', 'view', 'edit');

alter table public.profiles add constraint profiles_id_household_unique unique (id, household_id);

create table public.module_permissions (
  user_id uuid not null,
  household_id uuid not null references public.households(id) on delete cascade,
  module public.module_name not null,
  level public.permission_level not null default 'none',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, module),
  foreign key (user_id, household_id) references public.profiles(id, household_id) on delete cascade
);
create index module_permissions_household_idx on public.module_permissions(household_id);
create trigger module_permissions_updated_at before update on public.module_permissions
  for each row execute function public.set_updated_at();

create or replace function public.has_module_access(
  requested_module public.module_name, required_level public.permission_level
) returns boolean
language sql stable security definer set search_path = '' as $$
  select required_level <> 'none' and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (
      p.role = 'admin' or exists (
        select 1 from public.module_permissions mp
        where mp.user_id = p.id and mp.household_id = p.household_id
          and mp.module = requested_module
          and (mp.level = 'edit' or (mp.level = 'view' and required_level = 'view'))
      )
    )
  )
$$;
revoke all on function public.has_module_access(public.module_name, public.permission_level) from public;
grant execute on function public.has_module_access(public.module_name, public.permission_level) to authenticated;

alter table public.module_permissions enable row level security;
create policy "miembro ve sus permisos y admin los del hogar" on public.module_permissions
  for select to authenticated using (
    household_id = public.current_household_id() and (user_id = (select auth.uid()) or public.is_admin())
  );
create policy "admin asigna permisos de su hogar" on public.module_permissions
  for insert to authenticated with check (
    household_id = public.current_household_id() and public.is_admin() and created_by = (select auth.uid())
  );
create policy "admin actualiza permisos de su hogar" on public.module_permissions
  for update to authenticated using (household_id = public.current_household_id() and public.is_admin())
  with check (household_id = public.current_household_id() and public.is_admin() and created_by = (select auth.uid()));
create policy "admin elimina permisos de su hogar" on public.module_permissions
  for delete to authenticated using (household_id = public.current_household_id() and public.is_admin());

-- El cliente solo puede cambiar nombre/avatar: identidad, hogar y rol son inmutables.
drop policy "cada quien edita su perfil" on public.profiles;
create policy "cada quien edita su perfil" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Serializar altas por hogar para respetar el límite incluso ante dos solicitudes simultáneas.
create or replace function public.enforce_household_members() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id is distinct from old.id or new.household_id is distinct from old.household_id
      or new.role is distinct from old.role then
      raise exception 'No se puede cambiar la identidad, el hogar o el rol de un perfil';
    end if;
    return new;
  end if;
  perform 1 from public.households where id = new.household_id for update;
  if exists (select 1 from public.profiles where household_id = new.household_id and role = new.role) then
    raise exception 'El hogar ya tiene un usuario con ese rol';
  end if;
  return new;
end
$$;
create trigger profiles_member_limit before insert or update on public.profiles
  for each row execute function public.enforce_household_members();
revoke all on function public.enforce_household_members() from public;
