create table public.card_statements (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  card_id uuid not null,
  starts_on date not null,
  closes_on date not null,
  due_on date not null check (due_on > closes_on),
  app_total numeric(14,2) not null check (app_total >= 0),
  bank_cash_due numeric(14,2) not null check (bank_cash_due > 0),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (card_id, closes_on),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (card_id, household_id) references public.accounts(id, household_id)
);
create index card_statements_card_due_idx on public.card_statements(card_id, due_on);
alter table public.card_statements enable row level security;
grant select on public.card_statements to authenticated;
create policy card_statements_read on public.card_statements for select to authenticated
  using (household_id = public.current_household_id() and public.has_module_access('accounts','view'));

create table public.card_statement_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  card_payment_id uuid not null,
  statement_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (card_payment_id, statement_id),
  foreign key (card_payment_id, household_id) references public.card_payments(id, household_id) on delete cascade,
  foreign key (statement_id, household_id) references public.card_statements(id, household_id) on delete cascade
);
create index card_statement_allocations_statement_idx on public.card_statement_allocations(statement_id);
alter table public.card_statement_allocations enable row level security;
grant select on public.card_statement_allocations to authenticated;
create policy card_statement_allocations_read on public.card_statement_allocations for select to authenticated
  using (household_id = public.current_household_id() and public.has_module_access('accounts','view'));

create function public.upsert_card_statement(p_id uuid,p_card_id uuid,p_closes_on date,p_due_on date,p_bank_cash_due numeric,p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id(); a public.accounts; app numeric; paid numeric;
begin
  if h is null or not public.has_module_access('accounts','edit') then raise exception 'Sin permiso para conciliar tarjetas' using errcode='42501'; end if;
  select * into a from public.accounts where id=p_card_id and household_id=h and type='credit_card' and not is_archived for update;
  if a.id is null or p_id is null or p_closes_on is null or p_due_on is null or p_due_on<=p_closes_on
    or p_bank_cash_due is null or p_bank_cash_due<=0 or p_bank_cash_due<>round(p_bank_cash_due,2)
    or p_closes_on <> date_trunc('month',p_closes_on)::date + least(a.statement_closing_day,extract(day from (date_trunc('month',p_closes_on)+interval '1 month - 1 day'))::integer)-1 then
    raise exception 'Datos del estado de cuenta inválidos'; end if;
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
grant execute on function public.upsert_card_statement(uuid,uuid,date,date,numeric,text) to authenticated;

create function public.allocate_card_payment(p_card_payment_id uuid,p_allocations jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare h uuid := public.current_household_id(); p public.card_payments; r record; total numeric:=0; allocated numeric;
begin
  if h is null or not public.has_module_access('accounts','edit') or jsonb_typeof(p_allocations)<>'array' then raise exception 'Asignaciones inválidas'; end if;
  select * into p from public.card_payments where id=p_card_payment_id and household_id=h for update;
  if p.id is null then raise exception 'Pago no disponible'; end if;
  for r in select * from jsonb_to_recordset(p_allocations) as x(statement_id uuid,amount numeric) loop
    if r.amount is null or r.amount<=0 or r.amount<>round(r.amount,2) then raise exception 'Importe de asignación inválido'; end if;
    select coalesce(sum(t.amount),0) into allocated from public.transactions t where t.card_payment_id=p.id;
    total:=total+r.amount;
    if not exists(select 1 from public.card_statements s where s.id=r.statement_id and s.household_id=h and s.card_id=p.card_id) then raise exception 'Estado no disponible'; end if;
    if r.amount > (select s.bank_cash_due-coalesce(sum(a.amount),0) from public.card_statements s left join public.card_statement_allocations a on a.statement_id=s.id where s.id=r.statement_id group by s.id) then raise exception 'La asignación supera el pendiente del estado'; end if;
    insert into public.card_statement_allocations(household_id,card_payment_id,statement_id,amount) values(h,p.id,r.statement_id,r.amount);
  end loop;
  if total > allocated then raise exception 'Las asignaciones superan el pago'; end if;
end $$;
revoke all on function public.allocate_card_payment(uuid,jsonb) from public;
grant execute on function public.allocate_card_payment(uuid,jsonb) to authenticated;
