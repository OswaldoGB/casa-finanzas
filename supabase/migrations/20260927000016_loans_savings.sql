-- Préstamos otorgados y apartados: todo saldo procede del libro publicado.
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  debtor text not null check(length(trim(debtor)) between 1 and 100),
  amount numeric(14,2) not null check(amount > 0),
  date date not null,
  expected_payment_date date,
  notes text,
  status text not null default 'active' check(status in ('active','paid','written_off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,household_id),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  check(expected_payment_date is null or expected_payment_date >= date)
);
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check(length(trim(name)) between 1 and 100),
  type text not null default 'goal' check(type in ('goal','provision')),
  target_amount numeric(14,2) not null check(target_amount > 0),
  target_date date,
  account_id uuid,
  color text not null default '#16a34a' check(color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'piggy-bank' check(length(trim(icon)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,household_id),
  foreign key(created_by,household_id) references public.profiles(id,household_id),
  foreign key(account_id,household_id) references public.accounts(id,household_id)
);
alter table public.transactions add foreign key(loan_id,household_id) references public.loans(id,household_id);
alter table public.transactions add foreign key(savings_goal_id,household_id) references public.savings_goals(id,household_id);
alter table public.recurring_rules add foreign key(loan_id,household_id) references public.loans(id,household_id);
alter table public.recurring_rules add foreign key(savings_goal_id,household_id) references public.savings_goals(id,household_id);
alter table public.transactions add constraint transactions_goal_link check (
  (type in ('goal_contribution','goal_withdrawal')) = (savings_goal_id is not null));
alter table public.recurring_rules add constraint recurring_goal_link check (
  (type in ('goal_contribution','goal_withdrawal')) = (savings_goal_id is not null));
create index loans_household_idx on public.loans(household_id);
create index goals_household_idx on public.savings_goals(household_id);
create index transactions_loan_idx on public.transactions(loan_id) where loan_id is not null;
create index transactions_goal_idx on public.transactions(savings_goal_id) where savings_goal_id is not null;

do $$ declare tbl text; mod text; begin
  foreach tbl in array array['loans','savings_goals'] loop
    mod := case when tbl='loans' then 'loans' else 'savings' end;
    execute format('alter table public.%I enable row level security',tbl);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',tbl,tbl);
    execute format('create trigger %I_identity before update on public.%I for each row execute function public.finance_immutable_identity()',tbl,tbl);
    execute format('create policy %I_read on public.%I for select to authenticated using (household_id = (select public.current_household_id()) and (select public.has_module_access(%L, ''view'')))',tbl,tbl,mod);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid()) and (select public.has_module_access(%L, ''edit'')))',tbl,tbl,mod);
    execute format('create policy %I_update on public.%I for update to authenticated using (household_id = (select public.current_household_id()) and (select public.has_module_access(%L, ''edit''))) with check (household_id = (select public.current_household_id()) and (select public.has_module_access(%L, ''edit'')))',tbl,tbl,mod,mod);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (household_id = (select public.current_household_id()) and (select public.has_module_access(%L, ''edit'')))',tbl,tbl,mod);
  end loop;
end $$;

create function public.guard_savings_definition() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if (new.account_id is distinct from old.account_id or new.type is distinct from old.type)
    and (exists(select 1 from public.transactions where savings_goal_id=old.id)
      or exists(select 1 from public.recurring_rules where savings_goal_id=old.id)) then
    raise exception 'No se puede cambiar la cuenta o el tipo de un apartado con movimientos';
  end if;
  return new;
end $$;
create trigger savings_definition before update on public.savings_goals
for each row execute function public.guard_savings_definition();

create function public.guard_loan_definition() returns trigger
language plpgsql security definer set search_path='' as $$
declare lent numeric; recovered numeric; begin
  select coalesce(sum(amount) filter(where type='loan_out'),0),
    coalesce(sum(amount) filter(where type='loan_repayment'),0) into lent,recovered
  from public.transactions where loan_id=old.id and status='posted';
  if (new.amount is distinct from old.amount or new.date is distinct from old.date) and lent>0 then
    raise exception 'El monto y fecha del préstamo registrado no se pueden cambiar';
  end if;
  if new.status='paid' and (lent=0 or recovered<lent) then
    raise exception 'El préstamo todavía tiene saldo pendiente';
  end if;
  if new.status='active' and lent>0 and recovered>=lent then
    raise exception 'El préstamo está pagado';
  end if;
  return new;
end $$;
create trigger loans_definition before update on public.loans
for each row execute function public.guard_loan_definition();

-- Este control también cubre escrituras directas y el procesador recurrente.
-- Bloquear la entidad serializa abonos/retiros concurrentes.
create function public.guard_loan_goal_transaction() returns trigger
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
create trigger transactions_loan_goal_guard before insert or update or delete on public.transactions
for each row execute function public.guard_loan_goal_transaction();

create function public.sync_loan_status() returns trigger
language plpgsql security definer set search_path='' as $$
declare linked uuid; lent numeric; recovered numeric; begin
  linked:=case when TG_OP='DELETE' then old.loan_id else new.loan_id end;
  if linked is not null then
    select coalesce(sum(amount) filter(where type='loan_out'),0),coalesce(sum(amount) filter(where type='loan_repayment'),0)
      into lent,recovered from public.transactions where loan_id=linked and status='posted';
    update public.loans set status=case when lent>0 and recovered>=lent then 'paid' else 'active' end
      where id=linked and status<>'written_off';
  end if;
  return null;
end $$;
create trigger transactions_loan_status after insert or update or delete on public.transactions
for each row execute function public.sync_loan_status();

create function public.loan_create(p_debtor text,p_amount numeric,p_date date,
  p_expected_payment_date date,p_notes text,p_account_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); result uuid; begin
  if not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar préstamos'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived) then raise exception 'Cuenta no disponible'; end if;
  insert into public.loans(household_id,created_by,debtor,amount,date,expected_payment_date,notes)
    values(h,auth.uid(),p_debtor,p_amount,p_date,p_expected_payment_date,p_notes) returning id into result;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,loan_id,description)
    values(h,auth.uid(),'loan_out',p_amount,p_date,p_account_id,result,'Préstamo a '||p_debtor);
  return result;
end $$;
create function public.loan_repay(p_loan_id uuid,p_amount numeric,p_date date,p_account_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); result uuid; begin
  if not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar abonos'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived) then raise exception 'Cuenta no disponible'; end if;
  perform 1 from public.loans where id=p_loan_id and household_id=h for update;
  if not found then raise exception 'Préstamo no disponible'; end if;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,loan_id,description)
    values(h,auth.uid(),'loan_repayment',p_amount,p_date,p_account_id,p_loan_id,'Abono de préstamo') returning id into result;
  return result;
end $$;
create function public.loan_write_off(p_loan_id uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
  if not public.has_module_access('loans','edit') then raise exception 'Sin permiso de préstamos'; end if;
  update public.loans set status='written_off' where id=p_loan_id and household_id=public.current_household_id() and status='active';
  if not found then raise exception 'Préstamo activo no disponible'; end if;
  update public.recurring_rules set is_active=false where loan_id=p_loan_id;
end $$;
create function public.savings_goal_operation(p_goal_id uuid,p_type public.transaction_type,
  p_amount numeric,p_date date,p_counterparty_account_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); goal public.savings_goals; result uuid; src uuid; dst uuid; begin
  if not(public.has_module_access('savings','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar aportes o retiros'; end if;
  if p_type not in ('goal_contribution','goal_withdrawal') then raise exception 'Operación no válida'; end if;
  select * into goal from public.savings_goals where id=p_goal_id and household_id=h for update;
  if not found then raise exception 'Apartado no disponible'; end if;
  if goal.account_id is not null then
    if p_counterparty_account_id is null or p_counterparty_account_id=goal.account_id
      or (select count(*) from public.accounts where id in (goal.account_id,p_counterparty_account_id) and household_id=h and not is_archived)<>2 then
      raise exception 'Selecciona dos cuentas disponibles distintas';
    end if;
    src:=case when p_type='goal_contribution' then p_counterparty_account_id else goal.account_id end;
    dst:=case when p_type='goal_contribution' then goal.account_id else p_counterparty_account_id end;
  elsif p_counterparty_account_id is not null then raise exception 'El apartado virtual no utiliza cuentas';
  end if;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,destination_account_id,savings_goal_id,description)
    values(h,auth.uid(),p_type,p_amount,p_date,src,dst,goal.id,goal.name) returning id into result;
  return result;
end $$;

create function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
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
      from public.transactions where loan_id=l.id and status='posted') t on true
    where l.household_id=public.current_household_id();
  return result;
end $$;
create function public.savings_snapshot(p_module public.module_name default 'savings') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
  if p_module not in ('savings','dashboard') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar ahorro'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'type',g.type,'target_amount',g.target_amount,
    'target_date',g.target_date,'account_id',g.account_id,'color',g.color,'icon',g.icon,'balance',coalesce(t.balance,0)) order by g.created_at desc),'[]'::jsonb)
    into result from public.savings_goals g left join lateral (
      select sum(case when type='goal_contribution' then amount else -amount end) balance
      from public.transactions where savings_goal_id=g.id and status='posted') t on true
    where g.household_id=public.current_household_id();
  return result;
end $$;

revoke all on function public.guard_savings_definition(),public.guard_loan_definition(),public.guard_loan_goal_transaction(),public.sync_loan_status() from public;
revoke all on function public.loan_create(text,numeric,date,date,text,uuid),public.loan_repay(uuid,numeric,date,uuid),public.loan_write_off(uuid),public.savings_goal_operation(uuid,public.transaction_type,numeric,date,uuid),public.loan_snapshot(public.module_name),public.savings_snapshot(public.module_name) from public;
grant execute on function public.loan_create(text,numeric,date,date,text,uuid),public.loan_repay(uuid,numeric,date,uuid),public.loan_write_off(uuid),public.savings_goal_operation(uuid,public.transaction_type,numeric,date,uuid),public.loan_snapshot(public.module_name),public.savings_snapshot(public.module_name) to authenticated;
