create table public.loan_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (name = trim(name) and length(name) between 1 and 100),
  unique (id, household_id)
);

create unique index loan_people_household_name on public.loan_people (household_id, lower(name));
alter table public.loan_people enable row level security;
create policy loan_people_read on public.loan_people for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('loans', 'view')));
create policy loan_people_create on public.loan_people for insert to authenticated
  with check (household_id = (select public.current_household_id()) and (select public.has_module_access('loans', 'edit')));
grant select, insert on public.loan_people to authenticated;

alter table public.loans add column person_id uuid;
alter table public.loans add constraint loans_person_household_fkey
  foreign key (person_id, household_id) references public.loan_people (id, household_id);
create index loans_person_idx on public.loans (person_id, household_id) where person_id is not null;

create function public.loan_set_person(p_loan_id uuid, p_person_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  home uuid := public.current_household_id();
begin
  if home is null or not public.has_module_access('loans', 'edit') then
    raise exception 'Sin permiso para vincular préstamos';
  end if;
  if p_person_id is not null and not exists (
    select 1 from public.loan_people where id = p_person_id and household_id = home
  ) then
    raise exception 'Persona no disponible';
  end if;
  update public.loans set person_id = p_person_id where id = p_loan_id and household_id = home;
  if not found then raise exception 'Préstamo no disponible'; end if;
end $$;

create function public.loan_create_for_person(
  p_person_id uuid, p_direction text, p_amount numeric, p_date date,
  p_expected_payment_date date default null, p_notes text default null,
  p_account_id uuid default null, p_already_recorded boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  person_name text;
  loan_id uuid;
begin
  if not public.has_module_access('loans', 'edit') then
    raise exception 'Sin permiso para registrar préstamos';
  end if;
  select name into person_name from public.loan_people
  where id = p_person_id and household_id = public.current_household_id();
  if not found then raise exception 'Persona no disponible'; end if;
  if p_direction = 'borrowed' then
    loan_id := public.debt_create(person_name, p_amount, p_date, p_expected_payment_date, p_notes);
  elsif p_direction = 'lent' then
    loan_id := public.loan_create_with_balance_effect(
      person_name, p_amount, p_date, p_expected_payment_date, p_notes, p_account_id, p_already_recorded
    );
  else
    raise exception 'Tipo de préstamo inválido';
  end if;
  perform public.loan_set_person(loan_id, p_person_id);
  return loan_id;
end $$;

revoke all on function public.loan_set_person(uuid, uuid) from public, anon;
revoke all on function public.loan_create_for_person(uuid, text, numeric, date, date, text, uuid, boolean) from public, anon;
grant execute on function public.loan_set_person(uuid, uuid) to authenticated;
grant execute on function public.loan_create_for_person(uuid, text, numeric, date, date, text, uuid, boolean) to authenticated;

create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'direction',l.direction,'debtor',l.debtor,'person_id',l.person_id,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'source_account_id',l.source_account_id,'source_account_name',a.name,'source_account_type',a.type,
    'already_recorded',l.already_recorded,'lent',l.amount,'recovered',l.recovered_amount,
    'pending',case when l.status='written_off' then 0 else l.amount-l.recovered_amount end,
    'overdue',coalesce(l.status='active' and l.expected_payment_date<today and l.recovered_amount<l.amount,false)) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join public.accounts a on a.id=l.source_account_id and a.household_id=l.household_id
    where l.household_id=public.current_household_id();
  return result;
end $$;
