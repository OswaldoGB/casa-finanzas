create function public.card_installment_schedule_internal(p_card_id uuid,p_after date,p_until date)
returns table(plan_id uuid,card_id uuid,installment integer,close_date date,due_date date,amount numeric)
language sql stable security definer set search_path = '' as $$
  select p.id,p.card_id,p.paid_installments+n.i+1,dates.closes,
    due.month + least(a.payment_due_day,extract(day from (due.month+interval '1 month - 1 day'))::integer)-1,
    case when n.i=p.installments-1 then p.amount-quote.amount*(p.installments-1) else quote.amount end
  from public.card_installment_plans p join public.accounts a on a.id=p.card_id
    cross join lateral generate_series(0,p.installments-1) n(i)
    cross join lateral (select trunc(coalesce(p.original_amount,p.amount)*100/
      case when p.original_amount is not null then p.installments+p.paid_installments else p.installments end)/100 as amount) quote
    cross join lateral (select (date_trunc('month',p.first_close)+n.i*interval '1 month')::date as month) m
    cross join lateral (select m.month+least(a.statement_closing_day,
      extract(day from (m.month+interval '1 month - 1 day'))::integer)-1 as closes) dates
    cross join lateral (select case when m.month+least(a.payment_due_day,
      extract(day from (m.month+interval '1 month - 1 day'))::integer)-1 <= dates.closes
      then (m.month+interval '1 month')::date else m.month end as month) due
  where p.card_id=p_card_id and p.household_id=a.household_id
    and dates.closes>p_after and dates.closes<=p_until
  order by p.id,n.i
$$;

revoke all on function public.card_installment_schedule_internal(uuid,date,date) from public,authenticated;
create or replace function public.card_installment_schedule(p_card_id uuid,p_after date,p_until date)
returns table(plan_id uuid,card_id uuid,installment integer,close_date date,due_date date,amount numeric)
language sql stable security definer set search_path='' as $$
  select s.* from public.card_installment_schedule_internal(p_card_id,p_after,p_until) s
  where public.can_read_accounts() and exists(select 1 from public.accounts a where a.id=p_card_id and a.household_id=public.current_household_id())
$$;
alter table public.card_statements drop constraint card_statements_bank_cash_due_check;
alter table public.card_statements add constraint card_statements_bank_cash_due_check check(bank_cash_due>=0);
create or replace function public.upsert_card_statement(p_id uuid,p_card_id uuid,p_closes_on date,p_due_on date,p_bank_cash_due numeric,p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id(); a public.accounts; app numeric; paid numeric;
begin
  if h is null or not public.has_module_access('accounts','edit') then raise exception 'Sin permiso para conciliar tarjetas' using errcode='42501'; end if;
  select * into a from public.accounts where id=p_card_id and household_id=h and type='credit_card' and not is_archived for update;
  if a.id is null or p_id is null or p_closes_on is null or p_due_on is null or p_due_on<=p_closes_on
    or p_closes_on > (select (now() at time zone timezone)::date from public.households where id=h) or p_bank_cash_due is null or p_bank_cash_due<0 or p_bank_cash_due<>round(p_bank_cash_due,2)
    or p_closes_on <> date_trunc('month',p_closes_on)::date + least(a.statement_closing_day,extract(day from (date_trunc('month',p_closes_on)+interval '1 month - 1 day'))::integer)-1 then
    raise exception 'Datos del estado de cuenta inválidos; revisa la fecha de corte y evita un corte futuro'; end if;
  select coalesce(sum(x.amount),0) into paid from public.card_statement_allocations x join public.card_statements s on s.id=x.statement_id where s.card_id=a.id and s.closes_on=p_closes_on;
  if p_bank_cash_due < paid then raise exception 'El pago de contado no puede ser menor que lo ya abonado'; end if;
  select greatest(0,public.account_balance_on(a.id,p_closes_on)-public.card_unbilled_installments(a.id,p_closes_on)) into app;
  insert into public.card_statements(id,household_id,created_by,card_id,starts_on,closes_on,due_on,app_total,bank_cash_due,note)
  values(p_id,h,auth.uid(),a.id,(p_closes_on-interval '1 month'+interval '1 day')::date,p_closes_on,p_due_on,app,p_bank_cash_due,trim(coalesce(p_note,'')))
  on conflict(card_id,closes_on) do update set due_on=excluded.due_on,bank_cash_due=excluded.bank_cash_due,note=excluded.note,updated_at=now()
  returning id into p_id;
  return p_id;
end $$;
revoke all on function public.upsert_card_statement(uuid,uuid,date,date,numeric,text) from public;
revoke execute on function public.upsert_card_statement(uuid,uuid,date,date,numeric,text) from authenticated;

-- Only quotas belonging to this cut may be covered by its official bank payment.
create function public.repair_unpaid_card_installment_links(p_card_id uuid) returns void
language sql security definer set search_path='' as $$
  update public.card_statement_installments i set statement_id=correct.id,due_date=correct.due_on
  from public.card_statements wrong, public.card_statements correct
  where wrong.id=i.statement_id and wrong.closes_on<>i.close_date
    and correct.card_id=wrong.card_id and correct.household_id=i.household_id and correct.closes_on=i.close_date
    and (p_card_id is null or correct.card_id=p_card_id)
    and not exists(select 1 from public.card_installment_payment_allocations a where a.statement_installment_id=i.id)
$$;
revoke all on function public.repair_unpaid_card_installment_links(uuid) from public,authenticated;
select public.repair_unpaid_card_installment_links(null);

create function public.rebuild_card_installment_allocations(p_statement_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.card_statements; payment record; quota record; remaining numeric; covered numeric; paid numeric;
begin
  select * into s from public.card_statements where id=p_statement_id for update;
  delete from public.card_installment_payment_allocations a using public.card_statement_installments i
    where a.statement_installment_id=i.id and i.statement_id=s.id and i.close_date=s.closes_on;
  for payment in select a.card_payment_id,a.amount from public.card_statement_allocations a
    join public.card_payments p on p.id=a.card_payment_id
    where a.statement_id=s.id order by p.date,p.created_at,p.id loop
    select greatest(0,payment.amount-coalesce(sum(a.amount),0)) into remaining
      from public.card_installment_payment_allocations a join public.card_statement_installments i on i.id=a.statement_installment_id
      where a.card_payment_id=payment.card_payment_id and i.statement_id=s.id and i.close_date<>s.closes_on;
    for quota in select * from public.card_statement_installments where statement_id=s.id and close_date=s.closes_on order by installment,plan_id,id loop
      exit when remaining<=0;
      select coalesce(sum(amount),0) into paid from public.card_installment_payment_allocations where statement_installment_id=quota.id;
      covered:=least(remaining,greatest(0,quota.amount-paid));
      if covered>0 then
        insert into public.card_installment_payment_allocations(household_id,card_payment_id,statement_installment_id,amount)
          values(s.household_id,payment.card_payment_id,quota.id,covered);
        remaining:=remaining-covered;
      end if;
      exit when remaining<=0;
    end loop;
  end loop;
end $$;
revoke all on function public.rebuild_card_installment_allocations(uuid) from public,authenticated;

create or replace function public.card_statement_settlement_snapshot(p_statement_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); s public.card_statements;
begin
  if h is null or not public.has_module_access('accounts','edit') then
    raise exception 'Sin permiso para conciliar tarjetas' using errcode='42501';
  end if;
  select * into s from public.card_statements where id=p_statement_id and household_id=h for update;
  if s.id is null then raise exception 'Estado de cuenta no disponible'; end if;
  perform public.repair_unpaid_card_installment_links(s.card_id);
  insert into public.card_statement_installments(household_id,statement_id,plan_id,installment,close_date,due_date,amount)
    select h,s.id,r.plan_id,r.installment,r.close_date,s.due_on,r.amount
    from public.card_installment_schedule(s.card_id,s.closes_on-1,s.closes_on) r
    where r.close_date=s.closes_on
    on conflict(plan_id,installment) do nothing;
  perform public.rebuild_card_installment_allocations(s.id);
end $$;

-- Register progress first, then link its remaining quotas to already confirmed cuts.
create or replace function public.create_card_installment_with_progress(p_id uuid,p_card_id uuid,p_name text,p_amount numeric,
  p_installments integer,p_paid_installments integer,p_amount_mode text,p_purchase_date date,p_first_close date,
  p_existing boolean,p_category_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare pending_amount numeric; monthly numeric; statement record; existing public.card_installment_plans;
begin
  if public.current_household_id() is null or not public.has_module_access('accounts','edit')
    or (not p_existing and not public.has_module_access('transactions','edit')) then
    raise exception 'Sin permiso para registrar compras a plazos' using errcode='42501'; end if;
  if p_id is null or p_existing is null or p_paid_installments is null or p_paid_installments<0
    or p_installments is null or p_installments not between 1 and 120 or p_paid_installments>=p_installments
    or (not p_existing and p_paid_installments<>0) or p_amount_mode is null or p_amount_mode not in ('original','remaining')
    or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount>999999999999.99 then
    raise exception 'Importe o avance de cuotas inválido'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  perform 1 from public.accounts where id=p_card_id and household_id=public.current_household_id() for update;
  select * into existing from public.card_installment_plans where id=p_id;
  if existing.id is not null then
    if existing.household_id<>public.current_household_id() or existing.created_by<>auth.uid() or existing.card_id<>p_card_id then
      raise exception 'Solicitud de plan no disponible'; end if;
  else
    monthly:=trunc(p_amount*100/case when p_amount_mode='original' then p_installments else p_installments-p_paid_installments end)/100;
    if monthly<0.01 then raise exception 'Cada cuota debe ser de al menos un centavo'; end if;
    pending_amount:=case when p_amount_mode='original' then p_amount-monthly*p_paid_installments else p_amount end;
    perform public.create_card_installment(p_id,p_card_id,p_name,pending_amount,p_installments-p_paid_installments,
      p_purchase_date,p_first_close,p_existing,p_category_id);
    update public.card_installment_plans set paid_installments=p_paid_installments,
      original_amount=case when p_amount_mode='original' then p_amount else null end where id=p_id;
  end if;
  for statement in select id from public.card_statements where card_id=p_card_id and household_id=public.current_household_id() order by closes_on,id loop
    perform public.card_statement_settlement_snapshot(statement.id);
  end loop;
  return p_id;
end $$;

-- Recover exact historical matches, without touching payments, ledger or prior paid counts.
insert into public.card_statement_installments(household_id,statement_id,plan_id,installment,close_date,due_date,amount)
  select s.household_id,s.id,r.plan_id,r.installment,r.close_date,s.due_on,r.amount
  from public.card_statements s
  cross join lateral public.card_installment_schedule_internal(s.card_id,s.closes_on-1,s.closes_on) r
  where r.close_date=s.closes_on
  on conflict(plan_id,installment) do nothing;
do $$ declare statement record;
begin
  for statement in select id from public.card_statements order by card_id,closes_on,id loop
    perform public.rebuild_card_installment_allocations(statement.id);
  end loop;
end $$;

create function public.settle_existing_card_payment(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); p public.card_payments; s public.card_statements; i public.card_statement_installments;
declare remaining numeric; statement_amount numeric; installment_amount numeric; line_paid numeric;
begin
  select * into p from public.card_payments where id=p_id and household_id=h for update;
  if p.id is null then raise exception 'Pago no disponible'; end if;
  select coalesce(sum(amount),0) into remaining from public.transactions where card_payment_id=p_id and household_id=h;
  for s in select * from public.card_statements where household_id=h and card_id=p.card_id and closes_on<=p.date
    order by closes_on,id for update
  loop
    exit when remaining<=0;
    select least(remaining,greatest(0,s.bank_cash_due-coalesce(sum(a.amount),0))) into statement_amount
      from public.card_statement_allocations a where a.statement_id=s.id;
    if statement_amount<=0 then continue; end if;
    insert into public.card_statement_allocations(household_id,card_payment_id,statement_id,amount)
      values(h,p_id,s.id,statement_amount);
    remaining:=remaining-statement_amount;
    for i in select * from public.card_statement_installments where household_id=h and statement_id=s.id and close_date=s.closes_on
      order by installment,plan_id,id for update
    loop
      select coalesce(sum(amount),0) into line_paid from public.card_installment_payment_allocations where statement_installment_id=i.id;
      installment_amount:=least(statement_amount,greatest(0,i.amount-line_paid));
      if installment_amount>0 then
        insert into public.card_installment_payment_allocations(household_id,card_payment_id,statement_installment_id,amount)
          values(h,p_id,i.id,installment_amount);
        statement_amount:=statement_amount-installment_amount;
      end if;
      exit when statement_amount<=0;
    end loop;
  end loop;
end $$;
revoke all on function public.settle_existing_card_payment(uuid) from public,authenticated;

create or replace function public.pay_credit_card_and_settle(p_id uuid,p_card_id uuid,p_date date,p_sources jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); existing public.card_payments;
begin
  if h is null or not public.has_module_access('accounts','edit') or not public.has_module_access('transactions','edit') or p_id is null then
    raise exception 'Sin permiso para pagar tarjetas' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into existing from public.card_payments where id=p_id;
  if existing.id is not null then
    if existing.household_id<>h or existing.created_by<>auth.uid() or existing.card_id<>p_card_id then
      raise exception 'Solicitud de pago no disponible';
    end if;
    return p_id;
  end if;
  perform public.pay_credit_card(p_id,p_card_id,p_date,p_sources);
  perform public.settle_existing_card_payment(p_id);
  return p_id;
end $$;

create or replace function public.pay_credit_card(p_id uuid,p_card_id uuid,p_date date,p_sources jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id();
declare a public.accounts;
declare row record;
declare total numeric := 0;
declare bank_pending numeric;
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
  select coalesce(sum(greatest(0,s.bank_cash_due-coalesce(x.paid,0))),0) into bank_pending
    from public.card_statements s left join lateral (select sum(amount) as paid from public.card_statement_allocations where statement_id=s.id) x on true
    where s.household_id=h and s.card_id=a.id and s.closes_on<=p_date;
  if total>greatest(0,public.account_balance_on(a.id,p_date),bank_pending) then raise exception 'El pago supera la deuda contable y los cortes pendientes del banco'; end if;
  insert into public.card_payments(id,household_id,created_by,card_id,date) values(p_id,h,auth.uid(),a.id,p_date);
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,destination_account_id,description,card_payment_id)
    select h,auth.uid(),'transfer',x.amount,p_date,x.account_id,a.id,'Pago de tarjeta · '||a.name,p_id
    from jsonb_to_recordset(p_sources) as x(account_id uuid,amount numeric);
  return p_id;
end $$;
revoke all on function public.pay_credit_card(uuid,uuid,date,jsonb) from public;
revoke execute on function public.pay_credit_card(uuid,uuid,date,jsonb) from authenticated;


-- The public entry point owns allocation as part of the same atomic operation.
revoke execute on function public.pay_credit_card(uuid,uuid,date,jsonb) from authenticated;
revoke execute on function public.allocate_card_payment(uuid,jsonb) from authenticated;
revoke execute on function public.pay_credit_card_with_allocations(uuid,uuid,date,jsonb,jsonb) from authenticated;

alter table public.transactions drop constraint transactions_card_payment_id_household_id_fkey;
alter table public.transactions add constraint transactions_card_payment_id_household_id_fkey
  foreign key(card_payment_id,household_id) references public.card_payments(id,household_id) on delete cascade;

create function public.guard_card_payment_transaction() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.card_payment_id is not null
    and exists(select 1 from public.card_payments where id=old.card_payment_id)
    and exists(select 1 from public.households where id=old.household_id) then
    if TG_OP='DELETE' then raise exception 'Corrige el pago completo desde el historial de la tarjeta'; end if;
    if new.amount is distinct from old.amount or new.date is distinct from old.date
      or new.account_id is distinct from old.account_id or new.destination_account_id is distinct from old.destination_account_id
      or new.type is distinct from old.type or new.status is distinct from old.status
      or new.card_payment_id is distinct from old.card_payment_id then
      raise exception 'Corrige el pago completo desde el historial de la tarjeta';
    end if;
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.guard_card_payment_transaction() from public;
create trigger transactions_card_payment_guard before update or delete on public.transactions
  for each row execute function public.guard_card_payment_transaction();

-- A corrected payment keeps the original private file key even when its funding changes.
alter table public.attachments add column storage_transaction_id uuid;
alter table public.attachments drop constraint attachments_check;
alter table public.attachments add constraint attachments_check
  check(storage_path like household_id::text||'/'||coalesce(storage_transaction_id,transaction_id)::text||'/%');
drop policy receipts_read on storage.objects;
create policy receipts_read on storage.objects for select to authenticated
  using(bucket_id='receipts' and public.has_module_access('transactions','view')
    and (storage.foldername(name))[1]=public.current_household_id()::text
    and (exists(select 1 from public.transactions t where t.household_id=public.current_household_id() and t.id::text=(storage.foldername(name))[2])
      or exists(select 1 from public.attachments a join public.transactions t on t.id=a.transaction_id and t.household_id=a.household_id
        where a.household_id=public.current_household_id() and a.storage_path=name)));
drop policy receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for delete to authenticated
  using(bucket_id='receipts' and public.has_module_access('transactions','edit')
    and (storage.foldername(name))[1]=public.current_household_id()::text
    and (exists(select 1 from public.transactions t where t.household_id=public.current_household_id() and t.id::text=(storage.foldername(name))[2])
      or exists(select 1 from public.attachments a join public.transactions t on t.id=a.transaction_id and t.household_id=a.household_id
        where a.household_id=public.current_household_id() and a.storage_path=name)));

create function public.replace_card_payment(p_payment_id uuid,p_id uuid,p_card_id uuid,p_date date,p_sources jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); p public.card_payments; receipts jsonb; receipt jsonb; target uuid; original_source uuid; affected uuid[]; payment record;
begin
  if h is null or not public.has_module_access('accounts','edit') or not public.has_module_access('transactions','edit')
    or p_id is null or p_payment_id is null or p_id=p_payment_id then
    raise exception 'Sin permiso para corregir este pago' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_payment_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into p from public.card_payments where id=p_id;
  if p.id is not null then
    if p.household_id=h and p.card_id=p_card_id and p.created_by=auth.uid() then return p_id; end if;
    raise exception 'Solicitud de pago no disponible';
  end if;
  -- Match the lock order used by payment registration, including the original sources.
  perform 1 from public.accounts where household_id=h and (id=p_card_id or id in
    (select account_id from public.transactions where card_payment_id=p_payment_id) or id in
    (select account_id from jsonb_to_recordset(p_sources) as x(account_id uuid,amount numeric))) order by id for update;
  select * into p from public.card_payments where id=p_payment_id and household_id=h and card_id=p_card_id for update;
  if p.id is null or (p.created_by<>auth.uid() and not exists(select 1 from public.profiles where id=auth.uid() and household_id=h and role='admin')) then
    raise exception 'Pago no disponible para corregir';
  end if;
  select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('original_source',t.account_id)),'[]'::jsonb)
    into receipts from public.attachments a join public.transactions t on t.id=a.transaction_id where t.card_payment_id=p.id;
  select coalesce(array_agg(cp.id),'{}'::uuid[]) into affected from public.card_payments cp
    where cp.card_id=p_card_id and cp.household_id=h and cp.id<>p.id
;
  delete from public.card_installment_payment_allocations where card_payment_id=any(affected);
  delete from public.card_statement_allocations where card_payment_id=any(affected);
  delete from public.card_payments where id=p.id;
  perform public.repair_unpaid_card_installment_links(p_card_id);
  perform public.pay_credit_card_and_settle(p_id,p_card_id,p_date,p_sources);
  affected:=array_append(affected,p_id);
  delete from public.card_installment_payment_allocations where card_payment_id=p_id;
  delete from public.card_statement_allocations where card_payment_id=p_id;
  for payment in select id from public.card_payments where id=any(affected) order by date,created_at,id for update loop
    perform public.settle_existing_card_payment(payment.id);
  end loop;
  for receipt in select value from jsonb_array_elements(receipts) loop
    original_source:=(receipt->>'original_source')::uuid;
    select id into target from public.transactions where card_payment_id=p_id
      order by (account_id=original_source) desc,id limit 1;
    insert into public.attachments select * from jsonb_populate_record(null::public.attachments,
      (receipt-'original_source')||jsonb_build_object('storage_transaction_id',coalesce((receipt->>'storage_transaction_id')::uuid,(receipt->>'transaction_id')::uuid),'transaction_id',target));
  end loop;
  return p_id;
end $$;
revoke all on function public.replace_card_payment(uuid,uuid,uuid,date,jsonb) from public;
grant execute on function public.replace_card_payment(uuid,uuid,uuid,date,jsonb) to authenticated;
