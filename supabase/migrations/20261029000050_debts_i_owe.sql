-- Deudas que debo: el mismo módulo de préstamos con dirección.
--   lent      = yo presté (como hasta hoy): loan_out sale de mi cuenta, loan_repayment entra.
--   borrowed  = me prestaron / pagaron por mí: no mueve dinero al crearse; cada abono que
--               hago es un loan_out desde mi cuenta. recovered_amount guarda lo abonado.
alter table public.loans add column direction text not null default 'lent' check (direction in ('lent','borrowed'));

create or replace function public.sync_loan_status() returns trigger
language plpgsql security definer set search_path='' as $$
declare linked uuid; lent numeric; recovered numeric; l public.loans; begin
  linked:=case when TG_OP='DELETE' then old.loan_id else new.loan_id end;
  if linked is not null then
    select * into l from public.loans where id=linked;
    select coalesce(sum(tx.amount) filter(where tx.type='loan_out'),0),coalesce(sum(tx.amount) filter(where tx.type='loan_repayment'),0)
      into lent,recovered from public.transactions tx where tx.loan_id=linked and tx.status='posted';
    if l.direction='borrowed' then
      update public.loans set recovered_amount=lent,status=case when lent>=amount then 'paid' else 'active' end
        where id=linked and status<>'written_off';
    else
      update public.loans set recovered_amount=recovered,status=case when lent>0 and recovered>=lent then 'paid' else 'active' end
        where id=linked and status<>'written_off';
    end if;
  end if;
  return null;
end $$;

create or replace function public.guard_loan_definition() returns trigger
language plpgsql security definer set search_path='' as $$
declare lent numeric; recovered numeric; begin
  if current_setting('casa_finanzas.loan_edit',true)='true' then return new; end if;
  if new.direction is distinct from old.direction then raise exception 'No se puede cambiar el tipo de préstamo'; end if;
  select coalesce(sum(amount) filter(where type='loan_out'),0),
    coalesce(sum(amount) filter(where type='loan_repayment'),0) into lent,recovered
  from public.transactions where loan_id=old.id and status='posted';
  if old.direction='lent' and (new.amount is distinct from old.amount or new.date is distinct from old.date) and lent>0 then
    raise exception 'El monto y fecha del préstamo registrado no se pueden cambiar';
  end if;
  if new.direction='borrowed' then
    if new.status='paid' and lent<new.amount then raise exception 'La deuda todavía tiene saldo pendiente'; end if;
    if new.status='active' and lent>=new.amount then raise exception 'La deuda está pagada'; end if;
    return new;
  end if;
  if new.status='paid' and (lent=0 or recovered<lent) then
    raise exception 'El préstamo todavía tiene saldo pendiente';
  end if;
  if new.status='active' and lent>0 and recovered>=lent then
    raise exception 'El préstamo está pagado';
  end if;
  return new;
end $$;

create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'direction',l.direction,'debtor',l.debtor,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'source_account_id',l.source_account_id,'source_account_name',a.name,'source_account_type',a.type,
    'already_recorded',l.already_recorded,'lent',l.amount,'recovered',l.recovered_amount,
    'pending',case when l.status='written_off' then 0 else l.amount-l.recovered_amount end,
    'overdue',coalesce(l.status='active' and l.expected_payment_date<today and l.recovered_amount<l.amount,false)) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join public.accounts a on a.id=l.source_account_id and a.household_id=l.household_id
    where l.household_id=public.current_household_id();
  return result;
end $$;

create or replace function public.loan_repay(p_loan_id uuid,p_amount numeric,p_date date,p_account_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); result uuid; begin
  if not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar abonos'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived and type<>'credit_card') then raise exception 'Cuenta de depósito no disponible'; end if;
  perform 1 from public.loans where id=p_loan_id and household_id=h and direction='lent' for update;
  if not found then raise exception 'Préstamo no disponible'; end if;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,loan_id,description)
    values(h,auth.uid(),'loan_repayment',p_amount,p_date,p_account_id,p_loan_id,'Abono de préstamo') returning id into result;
  return result;
end $$;

create or replace function public.loan_update(p_loan_id uuid,p_debtor text,p_amount numeric,p_date date,
  p_expected_payment_date date default null,p_notes text default null,p_account_id uuid default null,p_already_recorded boolean default null) returns void
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); loan public.loans; initial_transaction uuid; begin
  if h is null or not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para editar préstamos'; end if;
  select * into loan from public.loans where id=p_loan_id and household_id=h and status<>'written_off' for update;
  if not found then raise exception 'Préstamo activo o pagado no disponible'; end if;
  if loan.direction='borrowed' then
    if p_debtor is null or length(trim(p_debtor)) not between 1 and 100 or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
      or p_amount<loan.recovered_amount or p_date is null or (p_expected_payment_date is not null and p_expected_payment_date<p_date)
      or coalesce(length(p_notes),0)>2000 then raise exception 'Datos de la deuda inválidos'; end if;
    if exists(select 1 from public.transactions where loan_id=p_loan_id and type='loan_out' and date<p_date) then
      raise exception 'La fecha no puede ser posterior a un abono registrado'; end if;
    perform set_config('casa_finanzas.loan_edit','true',true);
    update public.loans set debtor=trim(p_debtor),amount=p_amount,date=p_date,expected_payment_date=p_expected_payment_date,
      notes=nullif(trim(coalesce(p_notes,'')),''),
      status=case when status='written_off' then status when recovered_amount>=p_amount then 'paid' else 'active' end
      where id=p_loan_id;
    return;
  end if;
  if p_debtor is null or length(trim(p_debtor)) not between 1 and 100 or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
    or p_amount<loan.recovered_amount or p_date is null or (p_expected_payment_date is not null and p_expected_payment_date<p_date)
    or coalesce(length(p_notes),0)>2000 or p_already_recorded is null then raise exception 'Datos del préstamo inválidos'; end if;
  if exists(select 1 from public.transactions where loan_id=p_loan_id and type='loan_repayment' and date<p_date) then
    raise exception 'La fecha no puede ser posterior a un abono registrado'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived) then raise exception 'Cuenta o tarjeta no disponible'; end if;
  select id into initial_transaction from public.transactions where loan_id=p_loan_id and household_id=h and type='loan_out'
    order by date,created_at limit 1 for update;
  if initial_transaction is null then raise exception 'No se encontró la salida inicial del préstamo'; end if;
  perform set_config('casa_finanzas.loan_edit','true',true);
  update public.loans set debtor=trim(p_debtor),amount=p_amount,date=p_date,expected_payment_date=p_expected_payment_date,
    notes=nullif(trim(coalesce(p_notes,'')),''),source_account_id=p_account_id,already_recorded=p_already_recorded
    where id=p_loan_id;
  update public.transactions set amount=p_amount,date=p_date,account_id=case when p_already_recorded then null else p_account_id end,
    description='Préstamo a '||trim(p_debtor) where id=initial_transaction;
end $$;

create or replace function public.guard_loan_goal_transaction() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_t public.transactions; loan public.loans; goal public.savings_goals;
  lent numeric; recovered numeric; net numeric; excluded uuid;
begin
  if TG_OP='DELETE' then row_t:=old; else row_t:=new; end if;
  if TG_OP='UPDATE' then
    if (old.loan_id is not null or old.savings_goal_id is not null or new.loan_id is not null or new.savings_goal_id is not null)
      and (new.loan_id is distinct from old.loan_id or new.savings_goal_id is distinct from old.savings_goal_id or new.type is distinct from old.type) then
      raise exception 'No se puede cambiar el vínculo o tipo de un movimiento de préstamo o ahorro';
    end if;
    excluded:=old.id;
  elsif TG_OP='DELETE' then excluded:=old.id;
  end if;
  if row_t.loan_id is not null then
    if auth.uid() is not null and not public.has_module_access('loans','edit') then raise exception 'Sin permiso de préstamos'; end if;
    select * into loan from public.loans where id=row_t.loan_id and household_id=row_t.household_id for update;
    if not found then raise exception 'Préstamo no disponible'; end if;
    if TG_OP<>'DELETE' and loan.status='written_off' then raise exception 'El préstamo fue dado por perdido'; end if;
    if row_t.type='loan_out' and row_t.account_id is null and not loan.already_recorded then
      raise exception 'Solo un préstamo ya reflejado puede omitir la salida de cuenta'; end if;
    if loan.direction='borrowed' and (row_t.type<>'loan_out' or row_t.account_id is null) then
      raise exception 'Los abonos a una deuda salen de una de tus cuentas'; end if;
    if row_t.type='loan_repayment' and exists(select 1 from public.accounts a where a.id=row_t.account_id and a.type='credit_card') then
      raise exception 'El dinero recuperado debe entrar a una cuenta, no a una tarjeta'; end if;
    select coalesce(sum(amount) filter(where type='loan_out'),0),coalesce(sum(amount) filter(where type='loan_repayment'),0)
      into lent,recovered from public.transactions where loan_id=loan.id and status='posted' and id is distinct from excluded;
    if TG_OP<>'DELETE' and row_t.status='posted' then
      if row_t.type='loan_out' then lent:=lent+row_t.amount; else recovered:=recovered+row_t.amount; end if;
    end if;
    if lent>loan.amount or recovered>lent then raise exception 'El movimiento supera el monto prestado o pendiente'; end if;
  end if;
  if row_t.savings_goal_id is not null then
    if auth.uid() is not null and not public.has_module_access('savings','edit') then raise exception 'Sin permiso de ahorro'; end if;
    select * into goal from public.savings_goals where id=row_t.savings_goal_id and household_id=row_t.household_id for update;
    if not found then raise exception 'Apartado no disponible'; end if;
    if TG_OP<>'DELETE' then
      if goal.account_id is null then
        if row_t.account_id is not null or row_t.destination_account_id is not null then raise exception 'El apartado virtual no mueve cuentas'; end if;
      elsif (row_t.type='goal_contribution' and row_t.destination_account_id is distinct from goal.account_id)
        or (row_t.type='goal_withdrawal' and row_t.account_id is distinct from goal.account_id)
        or row_t.account_id is null or row_t.destination_account_id is null then
        raise exception 'Las cuentas no corresponden al apartado';
      end if;
    end if;
    select coalesce(sum(case when type='goal_contribution' then amount else -amount end),0)
      into net from public.transactions where savings_goal_id=goal.id and status='posted' and id is distinct from excluded;
    if TG_OP<>'DELETE' and row_t.status='posted' then net:=net+case when row_t.type='goal_contribution' then row_t.amount else -row_t.amount end; end if;
    if net<0 then raise exception 'El retiro supera el dinero apartado'; end if;
  end if;
  return row_t;
end $$;

create function public.debt_create(p_creditor text,p_amount numeric,p_date date,
  p_expected_payment_date date default null,p_notes text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); result uuid; begin
  if h is null or not public.has_module_access('loans','edit') then raise exception 'Sin permiso para registrar deudas'; end if;
  if p_creditor is null or length(trim(p_creditor)) not between 1 and 100 or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
    or p_date is null or (p_expected_payment_date is not null and p_expected_payment_date<p_date)
    or coalesce(length(p_notes),0)>2000 then raise exception 'Datos de la deuda inválidos'; end if;
  insert into public.loans(household_id,created_by,direction,debtor,amount,date,expected_payment_date,notes)
    values(h,auth.uid(),'borrowed',trim(p_creditor),p_amount,p_date,p_expected_payment_date,nullif(trim(coalesce(p_notes,'')),'')) returning id into result;
  return result;
end $$;

create function public.debt_pay(p_loan_id uuid,p_amount numeric,p_date date,p_account_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); loan public.loans; result uuid; begin
  if not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar abonos'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived) then raise exception 'Cuenta o tarjeta no disponible'; end if;
  select * into loan from public.loans where id=p_loan_id and household_id=h and direction='borrowed' for update;
  if not found then raise exception 'Deuda no disponible'; end if;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,loan_id,description)
    values(h,auth.uid(),'loan_out',p_amount,p_date,p_account_id,p_loan_id,'Abono a '||loan.debtor) returning id into result;
  return result;
end $$;
revoke all on function public.debt_create(text,numeric,date,date,text),public.debt_pay(uuid,numeric,date,uuid) from public, anon;
grant execute on function public.debt_create(text,numeric,date,date,text),public.debt_pay(uuid,numeric,date,uuid) to authenticated;

-- Patrimonio neto: lo que me deben suma; lo que debo (desde su fecha) resta.
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
        from public.accounts a where a.household_id = household and (a.created_at at time zone (select timezone from public.households where id = household))::date <= least((m.month + interval '1 month - 1 day')::date, p_to)), 0) + coalesce((select sum(case when l.direction = 'borrowed' then -greatest(0, l.amount - coalesce((select sum(t.amount) from public.transactions t where t.loan_id=l.id and t.type='loan_out' and t.status='posted' and t.date <= least((m.month + interval '1 month - 1 day')::date,p_to)),0)) else greatest(0, coalesce((select sum(case when t.type = 'loan_out' then t.amount else -t.amount end) from public.transactions t where t.loan_id=l.id and t.status='posted' and t.date <= least((m.month + interval '1 month - 1 day')::date,p_to)),0)) end) from public.loans l where l.household_id=household and (l.direction <> 'borrowed' or l.date <= least((m.month + interval '1 month - 1 day')::date,p_to)) and (l.written_off_at is null or l.written_off_at > least((m.month + interval '1 month - 1 day')::date,p_to))),0) as balance
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
