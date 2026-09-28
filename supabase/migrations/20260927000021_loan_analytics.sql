alter table public.loans add column written_off_at date;
create function public.record_loan_write_off() returns trigger language plpgsql set search_path='' as $$
begin
  if old.status='written_off' and new.status<>old.status then raise exception 'Un préstamo incobrable no puede reabrirse'; end if;
  new.written_off_at := old.written_off_at;
  if new.status='written_off' and old.status<>'written_off' then
    select (now() at time zone timezone)::date into new.written_off_at from public.households where id=new.household_id;
  end if;
  return new;
end $$;
revoke all on function public.record_loan_write_off() from public;
create trigger loans_writeoff_history before update on public.loans for each row execute function public.record_loan_write_off();
create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'debtor',l.debtor,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'lent',coalesce(t.lent,0),'recovered',coalesce(t.recovered,0),
    'pending',case when l.status='written_off' then 0 else greatest(coalesce(t.lent,0)-coalesce(t.recovered,0),0) end,
    'overdue',coalesce(l.status='active' and l.expected_payment_date<today and coalesce(t.lent,0)>coalesce(t.recovered,0),false)) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join lateral (
      select sum(amount) filter(where type='loan_out') lent,sum(amount) filter(where type='loan_repayment') recovered
      from public.transactions where loan_id=l.id and status='posted' and date <= today) t on true
    where l.household_id=public.current_household_id();
  return result;
end $$;
create or replace function public.savings_snapshot(p_module public.module_name default 'savings') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
  if p_module not in ('savings','dashboard') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar ahorro'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'type',g.type,'target_amount',g.target_amount,
    'target_date',g.target_date,'account_id',g.account_id,'color',g.color,'icon',g.icon,'balance',coalesce(t.balance,0)) order by g.created_at desc),'[]'::jsonb)
    into result from public.savings_goals g left join lateral (
      select sum(case when type='goal_contribution' then amount else -amount end) balance
      from public.transactions where savings_goal_id=g.id and status='posted' and date <= (select (now() at time zone timezone)::date from public.households where id=g.household_id)) t on true
    where g.household_id=public.current_household_id();
  return result;
end $$;

create or replace function public.analytics_snapshot(p_from date, p_to date, p_module public.module_name)
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
  with recursive occurrences as ( select r.*, r.next_run_date as occurrence from public.recurring_rules r where r.household_id = household and r.is_active and r.next_run_date <= today + 14 union all select o.id,o.household_id,o.created_by,o.name,o.type,o.amount,o.account_id,o.destination_account_id,o.category_id,o.payment_method_id,o.description,o.notes,o.project_id,o.loan_id,o.savings_goal_id,o.frequency,o.interval_count,o.start_date,o.end_date,o.next_run_date,o.mode,o.is_active,o.created_at,o.updated_at,public.next_occurrence_date(o.occurrence,o.start_date,o.frequency,o.interval_count) from occurrences o where public.next_occurrence_date(o.occurrence,o.start_date,o.frequency,o.interval_count) <= today + 14 and (o.end_date is null or public.next_occurrence_date(o.occurrence,o.start_date,o.frequency,o.interval_count) <= o.end_date) ), selected as (
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
      select t.project_id as id, p.name, sum(t.amount) as amount
      from selected t join public.projects p on p.id = t.project_id and p.household_id = household where t.type = 'expense' group by t.project_id,p.name
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
        from public.accounts a where a.household_id = household and (a.created_at at time zone (select timezone from public.households where id = household))::date <= least((m.month + interval '1 month - 1 day')::date, p_to)), 0) + coalesce((select sum(greatest(0, coalesce((select sum(case when t.type = 'loan_out' then t.amount else -t.amount end) from public.transactions t where t.loan_id=l.id and t.status='posted' and t.date <= least((m.month + interval '1 month - 1 day')::date,p_to)),0))) from public.loans l where l.household_id=household and (l.written_off_at is null or l.written_off_at > least((m.month + interval '1 month - 1 day')::date,p_to))),0) as balance
      from months m
    ) grouped),
    'upcoming', coalesce((select jsonb_agg(row_to_json(grouped) order by grouped.date) from (
      select r.id, r.name, r.occurrence as date,
        r.amount * case when r.type = 'income' then 1 else -1 end as amount,
        case when a.type in ('cash', 'checking', 'savings')
          then r.amount * case when r.type = 'income' then 1 else -1 end else 0 end + case when destination.type in ('cash', 'checking', 'savings') then r.amount else 0 end as "cashImpact",
        case when destination.type = 'credit_card' then destination.id when a.type = 'credit_card' and r.type = 'income' then a.id else null end as "repaymentCardId", 'recurring'::text as kind
      from occurrences r join public.accounts a on a.id = r.account_id left join public.accounts destination on destination.id = r.destination_account_id
      where r.household_id = household and r.is_active and not a.is_archived
        and r.type in ('income', 'expense', 'transfer', 'goal_contribution', 'goal_withdrawal') and (destination.id is null or not destination.is_archived) and r.occurrence between today and today + 14 and (r.end_date is null or r.occurrence <= r.end_date)
    ) grouped), '[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.analytics_snapshot(date, date, public.module_name) from public;
grant execute on function public.analytics_snapshot(date, date, public.module_name) to authenticated;





