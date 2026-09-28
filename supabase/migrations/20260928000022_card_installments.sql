-- El gasto y la deuda se reconocen una sola vez; las cuotas difieren el pago.
create table public.card_installment_plans (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  card_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0),
  installments smallint not null check (installments between 1 and 120 and amount * 100 >= installments),
  purchase_date date not null,
  first_close date not null check (first_close >= purchase_date),
  transaction_id uuid,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (card_id, household_id) references public.accounts(id, household_id),
  foreign key (transaction_id, household_id) references public.transactions(id, household_id)
);
create index card_plans_card_idx on public.card_installment_plans(card_id);
alter table public.card_installment_plans enable row level security;
grant select on public.card_installment_plans to authenticated;
create policy card_plans_read on public.card_installment_plans for select to authenticated
  using (household_id = public.current_household_id() and public.has_module_access('accounts','view'));

create table public.card_payments (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  card_id uuid not null,
  date date not null,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (card_id, household_id) references public.accounts(id, household_id)
);
alter table public.card_payments enable row level security;
grant select on public.card_payments to authenticated;
create policy card_payments_read on public.card_payments for select to authenticated
  using (household_id = public.current_household_id() and public.has_module_access('accounts','view'));
alter table public.transactions add column card_payment_id uuid;
alter table public.transactions add foreign key (card_payment_id, household_id) references public.card_payments(id, household_id);
create unique index card_payment_source_idx on public.transactions(card_payment_id, account_id) where card_payment_id is not null;

-- Fechas según los días de corte/pago de la tarjeta, incluyendo febrero.
create function public.card_installment_schedule(p_card_id uuid, p_after date, p_until date)
returns table(plan_id uuid, card_id uuid, installment integer, close_date date, due_date date, amount numeric)
language sql stable security definer set search_path = '' as $$
  select p.id, p.card_id, n.i + 1, dates.closes,
    date_trunc('month', dates.closes + case when a.payment_due_day <= extract(day from dates.closes)
      then interval '1 month' else interval '0 month' end)::date
      + least(a.payment_due_day, extract(day from (date_trunc('month', dates.closes)
        + case when a.payment_due_day <= extract(day from dates.closes) then interval '2 months' else interval '1 month' end
        - interval '1 day'))::integer) - 1,
    case when n.i = p.installments - 1 then p.amount - trunc(p.amount * 100 / p.installments) / 100 * (p.installments - 1)
      else trunc(p.amount * 100 / p.installments) / 100 end
  from public.card_installment_plans p join public.accounts a on a.id = p.card_id
    cross join lateral generate_series(0, p.installments - 1) n(i)
    cross join lateral (select (date_trunc('month', p.first_close) + n.i * interval '1 month')::date as month) m
    cross join lateral (select m.month + least(a.statement_closing_day,
      extract(day from (m.month + interval '1 month - 1 day'))::integer) - 1 as closes) dates
  where p.card_id = p_card_id and p.household_id = public.current_household_id() and public.can_read_accounts()
    and dates.closes > p_after and dates.closes <= p_until
$$;
revoke all on function public.card_installment_schedule(uuid,date,date) from public;
grant execute on function public.card_installment_schedule(uuid,date,date) to authenticated;

create function public.card_unbilled_installments(p_card_id uuid, p_date date)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(s.amount),0) from public.card_installment_schedule(p_card_id,p_date,'9999-12-31') s
    join public.card_installment_plans p on p.id = s.plan_id where p.purchase_date <= p_date
$$;
revoke all on function public.card_unbilled_installments(uuid,date) from public;
grant execute on function public.card_unbilled_installments(uuid,date) to authenticated;

create or replace function public.card_statement_unpaid(p_account_id uuid,p_close date,p_today date)
returns numeric(14,2) language sql stable security definer set search_path = '' as $$
  select greatest(0, public.account_balance_on(a.id,p_close)
    - public.card_unbilled_installments(a.id,p_close) - coalesce((
      select sum(t.amount) from public.transactions t where t.household_id=a.household_id and t.status='posted'
        and t.date > p_close and t.date <= p_today and (t.destination_account_id=a.id
          or (t.account_id=a.id and t.type in ('income','loan_repayment')))
    ),0))::numeric(14,2)
  from public.accounts a where a.id=p_account_id and a.type='credit_card'
    and a.household_id=public.current_household_id() and public.can_read_accounts()
$$;

create function public.create_card_installment(p_id uuid,p_card_id uuid,p_name text,p_amount numeric,
  p_installments integer,p_purchase_date date,p_first_close date,p_existing boolean,p_category_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id();
declare a public.accounts;
declare tx uuid;
declare today date;
begin
  if h is null or not public.has_module_access('accounts','edit') or (not p_existing and not public.has_module_access('transactions','edit')) then
    raise exception 'Sin permiso para registrar compras a plazos' using errcode='42501'; end if;
  if p_id is null or p_existing is null or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2)
    or p_amount > 999999999999.99 or p_installments is null or p_installments not between 1 and 120
    or p_amount * 100 < p_installments or p_name is null or length(trim(p_name)) not between 1 and 120
    or p_purchase_date is null or p_first_close is null or p_first_close < p_purchase_date then
    raise exception 'Datos del plan inválidos'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  if exists(select 1 from public.card_installment_plans where id=p_id and household_id=h and created_by=auth.uid()) then return p_id; end if;
  select * into a from public.accounts where id=p_card_id and household_id=h and type='credit_card' and not is_archived for update;
  if a.id is null then raise exception 'Tarjeta no disponible'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=h;
  if p_purchase_date > today or p_first_close <> date_trunc('month',p_first_close)::date
    + least(a.statement_closing_day,extract(day from (date_trunc('month',p_first_close)+interval '1 month - 1 day'))::integer)-1 then
    raise exception 'Revisa la fecha y el primer corte de la tarjeta'; end if;
  if p_existing then
    if p_amount > greatest(0,public.account_balance_on(a.id,p_purchase_date)-public.card_unbilled_installments(a.id,p_purchase_date)) then
      raise exception 'El importe del plan supera la deuda disponible en esa fecha'; end if;
  else
    if not exists(select 1 from public.categories where id=p_category_id and household_id=h and type='expense' and not is_archived) then
      raise exception 'Elige una categoría de gasto activa'; end if;
    insert into public.transactions(household_id,created_by,type,amount,date,account_id,category_id,description)
      values(h,auth.uid(),'expense',p_amount,p_purchase_date,a.id,p_category_id,trim(p_name)) returning id into tx;
  end if;
  insert into public.card_installment_plans(id,household_id,created_by,card_id,name,amount,installments,purchase_date,first_close,transaction_id)
    values(p_id,h,auth.uid(),a.id,trim(p_name),p_amount,p_installments,p_purchase_date,p_first_close,tx);
  return p_id;
end $$;
revoke all on function public.create_card_installment(uuid,uuid,text,numeric,integer,date,date,boolean,uuid) from public;
grant execute on function public.create_card_installment(uuid,uuid,text,numeric,integer,date,date,boolean,uuid) to authenticated;

create function public.remove_card_installment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_module_access('accounts','edit') then raise exception 'Sin permiso' using errcode='42501'; end if;
  delete from public.card_installment_plans where id=p_id and household_id=public.current_household_id();
  if not found then raise exception 'Plan no encontrado'; end if;
end $$;
revoke all on function public.remove_card_installment(uuid) from public;
grant execute on function public.remove_card_installment(uuid) to authenticated;

create function public.pay_credit_card(p_id uuid,p_card_id uuid,p_date date,p_sources jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id();
declare a public.accounts;
declare row record;
declare total numeric := 0;
declare today date;
begin
  if h is null or not public.has_module_access('accounts','edit') or not public.has_module_access('transactions','edit') then
    raise exception 'Sin permiso para pagar tarjetas' using errcode='42501'; end if;
  if p_id is null or p_date is null or p_sources is null or jsonb_typeof(p_sources)<>'array' then raise exception 'Pago inválido'; end if;
  if jsonb_array_length(p_sources) not between 1 and 20 then raise exception 'Elige entre 1 y 20 cuentas'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  if exists(select 1 from public.card_payments where id=p_id and household_id=h and created_by=auth.uid() and card_id=p_card_id) then return p_id; end if;
  -- Bloqueo ordenado: pagos concurrentes desde varias cuentas no se interbloquean.
  perform 1 from public.accounts where household_id=h and (id=p_card_id or id in
    (select account_id from jsonb_to_recordset(p_sources) as x(account_id uuid,amount numeric))) order by id for update;
  select * into a from public.accounts where id=p_card_id and household_id=h and type='credit_card' and not is_archived;
  if a.id is null then raise exception 'Tarjeta no disponible'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=h;
  if p_date > today then raise exception 'El pago no puede tener fecha futura'; end if;
  if (select count(distinct account_id) from jsonb_to_recordset(p_sources) as x(account_id uuid,amount numeric)) <> jsonb_array_length(p_sources) then
    raise exception 'No repitas cuentas de origen'; end if;
  for row in select * from jsonb_to_recordset(p_sources) as x(account_id uuid,amount numeric) loop
    if row.amount is null or row.amount <= 0 or row.amount <> round(row.amount,2) or row.amount>999999999999.99
      or not exists(select 1 from public.accounts where id=row.account_id and household_id=h and type<>'credit_card' and not is_archived) then
      raise exception 'Cuenta o importe de origen inválido'; end if;
    if row.amount > public.account_balance_on(row.account_id,p_date) then raise exception 'Saldo insuficiente en una cuenta de origen'; end if;
    total := total + row.amount;
  end loop;
  if total > greatest(0,public.account_balance_on(a.id,p_date)) then raise exception 'El pago supera la deuda de la tarjeta en esa fecha'; end if;
  insert into public.card_payments(id,household_id,created_by,card_id,date) values(p_id,h,auth.uid(),a.id,p_date);
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,destination_account_id,description,card_payment_id)
    select h,auth.uid(),'transfer',x.amount,p_date,x.account_id,a.id,'Pago de tarjeta · '||a.name,p_id
    from jsonb_to_recordset(p_sources) as x(account_id uuid,amount numeric);
  return p_id;
end $$;
revoke all on function public.pay_credit_card(uuid,uuid,date,jsonb) from public;
grant execute on function public.pay_credit_card(uuid,uuid,date,jsonb) to authenticated;

-- Evita que editar/borrar el gasto original cambie un plan sin actualizar sus cuotas.
create function public.guard_installment_transaction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.card_installment_plans where transaction_id=old.id) then
    if TG_OP='DELETE' then raise exception 'Quita primero la financiación de esta compra'; end if;
    if new.amount is distinct from old.amount or new.date is distinct from old.date or new.account_id is distinct from old.account_id
      or new.type is distinct from old.type or new.status is distinct from old.status or new.destination_account_id is distinct from old.destination_account_id then
      raise exception 'Quita primero la financiación para cambiar importe, fecha o cuenta'; end if;
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.guard_installment_transaction() from public;
create trigger transactions_installment_guard before update or delete on public.transactions
  for each row execute function public.guard_installment_transaction();

-- Conserva el resumen existente y agrega las cuotas futuras para proyecciones.
alter function public.projection_inputs(integer) rename to projection_inputs_without_installments;
revoke all on function public.projection_inputs_without_installments(integer) from authenticated;
create function public.projection_inputs(p_months integer default 12) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
declare today date;
begin
  result := public.projection_inputs_without_installments(p_months);
  today := (result->>'today')::date;
  result := jsonb_set(result,'{accounts}',coalesce((select jsonb_agg(a || jsonb_build_object('installment_future',
    (select coalesce(sum(s.amount),0) from public.card_installment_schedule((a->>'id')::uuid,(a->>'statement_close')::date,'9999-12-31') s)))
    from jsonb_array_elements(result->'accounts') a),'[]'::jsonb));
  return result || jsonb_build_object('installments',coalesce((
    select jsonb_agg(jsonb_build_object('card_id',s.card_id,'close_date',s.close_date,'due_date',s.due_date,'amount',s.amount) order by s.due_date,s.plan_id,s.installment)
    from jsonb_array_elements(result->'accounts') a cross join lateral public.card_installment_schedule(
      (a->>'id')::uuid,(a->>'statement_close')::date,(date_trunc('month',today)+p_months*interval '1 month')::date) s
  ),'[]'::jsonb));
end $$;
revoke all on function public.projection_inputs(integer) from public;
grant execute on function public.projection_inputs(integer) to authenticated;
