create function public.analytics_snapshot(p_from date, p_to date, p_module public.module_name)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare household uuid := public.current_household_id();
declare today date;
declare result jsonb;
begin
  if household is null or p_module not in ('dashboard', 'reports')
    or not public.has_module_access(p_module, 'view') then
    raise exception 'Sin permiso para consultar este resumen' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Rango de fechas inválido';
  end if;
  select (now() at time zone h.timezone)::date into today
    from public.households h where h.id = household;
  with selected as (
    select * from public.transactions t where t.household_id = household
      and t.status = 'posted' and t.date between p_from and p_to
  ), months as (
    select month::date from generate_series(
      date_trunc('month', p_to)::date - interval '11 months',
      date_trunc('month', p_to)::date, interval '1 month') month
  )
  select jsonb_build_object(
    'totals', (select jsonb_build_object(
      'income', coalesce(sum(amount) filter (where type = 'income'), 0),
      'expense', coalesce(sum(amount) filter (where type = 'expense'), 0)) from selected),
    'categories', coalesce((select jsonb_agg(row_to_json(grouped) order by grouped.amount desc) from (
      select c.id, c.name, c.color, sum(t.amount) as amount
      from selected t join public.categories c on c.id = t.category_id
      where t.type = 'expense' group by c.id, c.name, c.color
    ) grouped), '[]'::jsonb),
    'methods', coalesce((select jsonb_agg(row_to_json(grouped) order by grouped.amount desc) from (
      select coalesce(m.id::text, 'none') as id, coalesce(m.name, 'Sin especificar') as name,
        sum(t.amount) as amount
      from selected t left join public.payment_methods m on m.id = t.payment_method_id
      where t.type = 'expense' group by m.id, m.name
    ) grouped), '[]'::jsonb),
    'users', coalesce((select jsonb_agg(row_to_json(grouped) order by grouped.name) from (
      select p.id, p.full_name as name,
        coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
        coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense
      from selected t join public.profiles p on p.id = t.created_by
      where t.type in ('income', 'expense') group by p.id, p.full_name
    ) grouped), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(row_to_json(grouped) order by grouped.amount desc) from (
      select t.project_id as id, 'Proyecto vinculado'::text as name, sum(t.amount) as amount
      from selected t where t.type = 'expense' and t.project_id is not null group by t.project_id
    ) grouped), '[]'::jsonb),
    'trend', (select jsonb_agg(row_to_json(grouped) order by grouped.month) from (
      select m.month,
        coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
        coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense
      from months m left join public.transactions t on t.household_id = household
        and t.status = 'posted' and t.date >= m.month and t.date < m.month + interval '1 month'
        and t.date <= p_to
      group by m.month
    ) grouped),
    'netWorth', (select jsonb_agg(row_to_json(grouped) order by grouped.month) from (
      select m.month, coalesce((select sum(case when a.type = 'credit_card' then -1 else 1 end *
        public.account_balance_on(a.id, least((m.month + interval '1 month - 1 day')::date, p_to)))
        from public.accounts a where a.household_id = household), 0) as balance
      from months m
    ) grouped),
    'upcoming', coalesce((select jsonb_agg(row_to_json(grouped) order by grouped.date) from (
      select r.id, r.name, r.next_run_date as date,
        r.amount * case when r.type = 'income' then 1 else -1 end as amount,
        case when a.type in ('cash', 'checking', 'savings')
          then r.amount * case when r.type = 'income' then 1 else -1 end else 0 end as "cashImpact",
        'recurring'::text as kind
      from public.recurring_rules r join public.accounts a on a.id = r.account_id
      where r.household_id = household and r.is_active and not a.is_archived
        and r.type in ('income', 'expense') and r.next_run_date between today and today + 14
    ) grouped), '[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.analytics_snapshot(date, date, public.module_name) from public;
grant execute on function public.analytics_snapshot(date, date, public.module_name) to authenticated;
