-- Fase 4: presupuestos mensuales y datos autorizados de proyección.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  month date not null check (extract(day from month) = 1),
  category_id uuid not null,
  amount numeric(14,2) not null check (amount >= 0),
  carry_over boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, month, category_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (category_id, household_id) references public.categories(id, household_id)
);
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger budgets_identity before update on public.budgets
  for each row execute function public.finance_immutable_identity();

create function public.validate_budget_category() returns trigger
language plpgsql security definer set search_path = '' as $$
declare category_kind public.category_type;
declare archived boolean;
begin
  if TG_TABLE_NAME = 'categories' then
    if new.type is distinct from old.type and exists (
      select 1 from public.budgets b where b.category_id = old.id
    ) then
      raise exception 'No se puede cambiar el tipo de una categoría con presupuestos';
    end if;
  else
    select c.type, c.is_archived into category_kind, archived
      from public.categories c where c.id = new.category_id and c.household_id = new.household_id
      for share;
    if category_kind is distinct from 'expense' then
      raise exception 'El presupuesto requiere una categoría de gasto del mismo hogar';
    end if;
    if archived and (TG_OP = 'INSERT' or new.category_id is distinct from old.category_id) then
      raise exception 'La categoría está archivada';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_budget_category() from public;
create trigger budgets_category_validate before insert or update on public.budgets
  for each row execute function public.validate_budget_category();
create trigger categories_budget_validate before update on public.categories
  for each row execute function public.validate_budget_category();

alter table public.budgets enable row level security;
create policy budgets_read on public.budgets for select to authenticated
  using (household_id = (select public.current_household_id())
    and (select public.has_module_access('budgets', 'view')));
create policy budgets_insert on public.budgets for insert to authenticated
  with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid())
    and (select public.has_module_access('budgets', 'edit')));
create policy budgets_update on public.budgets for update to authenticated
  using (household_id = (select public.current_household_id())
    and (select public.has_module_access('budgets', 'edit')))
  with check (household_id = (select public.current_household_id())
    and (select public.has_module_access('budgets', 'edit')));
create policy budgets_delete on public.budgets for delete to authenticated
  using (household_id = (select public.current_household_id())
    and (select public.has_module_access('budgets', 'edit')));

create function public.budget_snapshot(p_month date, p_module public.module_name default 'budgets')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare household uuid := public.current_household_id();
declare result jsonb;
begin
  if household is null or p_module is null or p_module not in ('budgets', 'projections', 'dashboard')
    or not public.has_module_access(p_module, 'view') then
    raise exception 'Sin permiso para consultar presupuestos' using errcode = '42501';
  end if;
  if p_month is null or extract(day from p_month) <> 1 then
    raise exception 'El mes debe comenzar el primer día';
  end if;
  with recursive expenses as (
    select t.category_id, date_trunc('month', t.date)::date as month, sum(t.amount) as spent
    from public.transactions t where t.household_id = household and t.status = 'posted'
      and t.type = 'expense' and t.date < p_month + interval '1 month'
      and t.date >= (select min(b.month) from public.budgets b where b.household_id = household)
    group by t.category_id, date_trunc('month', t.date)::date
  ), ordered as (
    select b.*, coalesce(e.spent, 0) as spent,
      row_number() over (partition by b.category_id order by b.month) as position
    from public.budgets b left join expenses e on e.category_id = b.category_id and e.month = b.month
    where b.household_id = household and b.month <= p_month
  ), accumulated as (
    select o.*, 0::numeric as carried from ordered o where o.position = 1
    union all
    select o.*, case when o.carry_over and o.month = a.month + interval '1 month'
      then greatest(0::numeric, a.amount + a.carried - a.spent) else 0::numeric end as carried
    from ordered o join accumulated a on a.category_id = o.category_id and o.position = a.position + 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'category_id', b.category_id, 'name', c.name, 'color', c.color,
    'amount', b.amount, 'carry_over', b.carry_over, 'carried', b.carried,
    'available', b.amount + b.carried, 'spent', b.spent
  ) order by c.sort_order, c.name), '[]'::jsonb) into result
  from accumulated b join public.categories c on c.id = b.category_id
  where b.month = p_month;
  return result;
end $$;
revoke all on function public.budget_snapshot(date, public.module_name) from public;
grant execute on function public.budget_snapshot(date, public.module_name) to authenticated;

create function public.copy_previous_budgets(p_month date)
returns integer language plpgsql security definer set search_path = '' as $$
declare household uuid := public.current_household_id();
declare inserted integer;
begin
  if household is null or not public.has_module_access('budgets', 'edit') then
    raise exception 'Sin permiso para editar presupuestos' using errcode = '42501';
  end if;
  if p_month is null or extract(day from p_month) <> 1 then
    raise exception 'El mes debe comenzar el primer día';
  end if;
  insert into public.budgets (household_id, created_by, month, category_id, amount, carry_over)
  select household, auth.uid(), p_month, b.category_id, b.amount, b.carry_over
  from public.budgets b join public.categories c on c.id = b.category_id
  where b.household_id = household and b.month = (p_month - interval '1 month')::date
    and not c.is_archived and c.type = 'expense'
  on conflict (household_id, month, category_id) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end $$;
revoke all on function public.copy_previous_budgets(date) from public;
grant execute on function public.copy_previous_budgets(date) to authenticated;

create function public.projection_inputs(p_months integer default 12)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare household uuid := public.current_household_id();
declare today date;
declare result jsonb;
begin
  if household is null or not public.has_module_access('projections', 'view') then
    raise exception 'Sin permiso para consultar proyecciones' using errcode = '42501';
  end if;
  if p_months is null or p_months not in (3, 6, 12) then
    raise exception 'El horizonte debe ser de 3, 6 o 12 meses';
  end if;
  select (now() at time zone h.timezone)::date into today from public.households h where h.id = household;
  with active_accounts as (
    select a.*, case when a.type = 'credit_card' then
      date_trunc('month', today)::date + least(a.statement_closing_day,
        extract(day from date_trunc('month', today) + interval '1 month - 1 day')::integer) - 1
      else null end as candidate_close
    from public.accounts a where a.household_id = household and not a.is_archived
  ), account_cycles as (
    select a.*, case when a.candidate_close <= today then a.candidate_close
      when a.candidate_close > today then (date_trunc('month', today) - interval '1 month')::date
        + least(a.statement_closing_day, extract(day from date_trunc('month', today) - interval '1 day')::integer) - 1
      else null end as statement_close
    from active_accounts a
  )
  select jsonb_build_object(
    'today', today,
    'accounts', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name, 'type', a.type, 'balance', public.account_balance_on(a.id, today),
      'statement_closing_day', a.statement_closing_day, 'payment_due_day', a.payment_due_day,
      'statement_close', a.statement_close, 'statement_unpaid', case when a.type = 'credit_card'
        then public.card_statement_unpaid(a.id, a.statement_close, today) else null end
    ) order by a.name) from account_cycles a), '[]'::jsonb),
    'recurring', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'name', r.name, 'type', r.type, 'amount', r.amount,
      'account_id', r.account_id, 'destination_account_id', r.destination_account_id,
      'category_id', r.category_id, 'frequency', r.frequency, 'interval_count', r.interval_count,
      'start_date', r.start_date, 'end_date', r.end_date, 'next_run_date', r.next_run_date, 'mode', r.mode
    ) order by r.next_run_date, r.id) from public.recurring_rules r
      left join public.accounts source on source.id = r.account_id
      left join public.accounts destination on destination.id = r.destination_account_id
      where r.household_id = household and r.is_active
        and (source.id is null or not source.is_archived)
        and (destination.id is null or not destination.is_archived)), '[]'::jsonb),
    'budgets', (select jsonb_agg(jsonb_build_object(
      'month', month::date, 'rows', public.budget_snapshot(month::date, 'projections')
    ) order by month) from generate_series(date_trunc('month', today),
      date_trunc('month', today) + p_months * interval '1 month', interval '1 month') month)
  ) into result;
  return result;
end $$;
revoke all on function public.projection_inputs(integer) from public;
grant execute on function public.projection_inputs(integer) to authenticated;
