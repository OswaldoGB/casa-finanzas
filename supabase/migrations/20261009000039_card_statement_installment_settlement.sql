create table public.card_statement_installments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  statement_id uuid not null,
  plan_id uuid not null,
  installment smallint not null check (installment > 0),
  close_date date not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (id, household_id),
  unique (statement_id, plan_id, installment),
  unique (plan_id, installment),
  foreign key (statement_id, household_id) references public.card_statements(id, household_id) on delete cascade,
  foreign key (plan_id, household_id) references public.card_installment_plans(id, household_id) on delete restrict
);
create index card_statement_installments_statement_idx on public.card_statement_installments(statement_id);
alter table public.card_statement_installments enable row level security;
grant select on public.card_statement_installments to authenticated;
create policy card_statement_installments_read on public.card_statement_installments for select to authenticated
  using (household_id = public.current_household_id() and public.has_module_access('accounts','view'));

create table public.card_installment_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  card_payment_id uuid not null,
  statement_installment_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (card_payment_id, statement_installment_id),
  foreign key (card_payment_id, household_id) references public.card_payments(id, household_id) on delete cascade,
  foreign key (statement_installment_id, household_id) references public.card_statement_installments(id, household_id) on delete cascade
);
create index card_installment_payment_allocations_line_idx on public.card_installment_payment_allocations(statement_installment_id);
alter table public.card_installment_payment_allocations enable row level security;
grant select on public.card_installment_payment_allocations to authenticated;
create policy card_installment_payment_allocations_read on public.card_installment_payment_allocations for select to authenticated
  using (household_id = public.current_household_id() and public.has_module_access('accounts','view'));

create function public.card_statement_settlement_snapshot(p_statement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id(); s public.card_statements; r record;
begin
  if h is null or not public.has_module_access('accounts','edit') then
    raise exception 'Sin permiso para conciliar tarjetas' using errcode='42501';
  end if;
  select * into s from public.card_statements where id=p_statement_id and household_id=h for update;
  if s.id is null then raise exception 'Estado de cuenta no disponible'; end if;
  for r in select * from public.card_installment_schedule(s.card_id,'0001-01-01',s.closes_on)
    order by close_date, installment, plan_id
  loop
    insert into public.card_statement_installments(household_id,statement_id,plan_id,installment,close_date,due_date,amount)
    values(h,s.id,r.plan_id,r.installment,r.close_date,r.due_date,r.amount)
    on conflict(plan_id,installment) do nothing;
  end loop;
end $$;
revoke all on function public.card_statement_settlement_snapshot(uuid) from public;
grant execute on function public.card_statement_settlement_snapshot(uuid) to authenticated;

create function public.save_card_statement_with_installments(
  p_id uuid,p_card_id uuid,p_closes_on date,p_due_on date,p_bank_cash_due numeric,p_note text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare statement_id uuid;
begin
  statement_id := public.upsert_card_statement(p_id,p_card_id,p_closes_on,p_due_on,p_bank_cash_due,p_note);
  perform public.card_statement_settlement_snapshot(statement_id);
  return statement_id;
end $$;
revoke all on function public.save_card_statement_with_installments(uuid,uuid,date,date,numeric,text) from public;
grant execute on function public.save_card_statement_with_installments(uuid,uuid,date,date,numeric,text) to authenticated;

create function public.pay_credit_card_and_settle(
  p_id uuid,p_card_id uuid,p_date date,p_sources jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id(); s public.card_statements; i public.card_statement_installments;
declare total numeric; remaining numeric; statement_amount numeric; installment_amount numeric; line_paid numeric;
begin
  perform public.pay_credit_card(p_id,p_card_id,p_date,p_sources);
  if h is null then raise exception 'Hogar no disponible'; end if;
  if exists(select 1 from public.card_statement_allocations where card_payment_id=p_id and household_id=h) then
    return p_id;
  end if;
  select coalesce(sum(amount),0) into total from public.transactions where card_payment_id=p_id and household_id=h;
  remaining := total;
  for s in select * from public.card_statements
    where household_id=h and card_id=p_card_id
    order by closes_on,id for update
  loop
    exit when remaining <= 0;
    select s.bank_cash_due-coalesce(sum(a.amount),0) into statement_amount
      from public.card_statement_allocations a where a.statement_id=s.id;
    statement_amount := least(remaining,greatest(0,statement_amount));
    if statement_amount <= 0 then continue; end if;
    insert into public.card_statement_allocations(household_id,card_payment_id,statement_id,amount)
      values(h,p_id,s.id,statement_amount);
    remaining := remaining-statement_amount;
    for i in select * from public.card_statement_installments
      where household_id=h and statement_id=s.id order by close_date,installment,id for update
    loop
      select coalesce(sum(a.amount),0) into line_paid
        from public.card_installment_payment_allocations a where a.statement_installment_id=i.id;
      installment_amount := least(statement_amount,greatest(0,i.amount-line_paid));
      if installment_amount > 0 then
        insert into public.card_installment_payment_allocations(household_id,card_payment_id,statement_installment_id,amount)
          values(h,p_id,i.id,installment_amount);
        statement_amount := statement_amount-installment_amount;
      end if;
      exit when statement_amount <= 0;
    end loop;
  end loop;
  return p_id;
end $$;
revoke all on function public.pay_credit_card_and_settle(uuid,uuid,date,jsonb) from public;
grant execute on function public.pay_credit_card_and_settle(uuid,uuid,date,jsonb) to authenticated;
