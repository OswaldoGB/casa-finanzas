create or replace function public.budget_snapshot(p_month date, p_module public.module_name default 'budgets')
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
      and t.date <= (select (now() at time zone h.timezone)::date from public.households h where h.id = household) and t.type = 'expense' and t.date < p_month + interval '1 month'
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


