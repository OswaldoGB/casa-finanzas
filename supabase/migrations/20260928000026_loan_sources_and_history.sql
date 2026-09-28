-- Un préstamo histórico conserva su importe por cobrar sin volver a alterar el saldo.
alter table public.loans add column source_account_id uuid;
alter table public.loans add column already_recorded boolean not null default false;
update public.loans l set source_account_id = (
  select t.account_id from public.transactions t
  where t.loan_id=l.id and t.type='loan_out' and t.account_id is not null
  order by t.date,t.created_at limit 1
) where source_account_id is null;
alter table public.loans add foreign key(source_account_id,household_id)
  references public.accounts(id,household_id);

do $$ declare constraint_name text; begin
  select conname into constraint_name from pg_constraint
  where conrelid='public.transactions'::regclass and contype='c'
    and pg_get_constraintdef(oid) ilike '%destination_account_id is null%'
    and pg_get_constraintdef(oid) ilike '%loan_out%';
  execute format('alter table public.transactions drop constraint %I',constraint_name);
end $$;
alter table public.transactions add constraint transactions_account_shape check (
  (type='transfer' and account_id is not null and destination_account_id is not null and category_id is null)
  or (type in ('goal_contribution','goal_withdrawal') and savings_goal_id is not null
    and ((account_id is null and destination_account_id is null) or (account_id is not null and destination_account_id is not null)) and category_id is null)
  or (type in ('income','expense','loan_repayment') and account_id is not null and destination_account_id is null
    and (type not in ('income','expense') or category_id is not null))
  or (type='loan_out' and destination_account_id is null and category_id is null)
);

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
    if TG_OP<>'DELETE' and row_t.status='posted' then net:=net+case when row_t.type='goal_contribution' then row_t.amount else -amount end; end if;
    if net<0 then raise exception 'El retiro supera el dinero apartado'; end if;
  end if;
  return row_t;
end $$;

create function public.loan_create_with_balance_effect(p_debtor text,p_amount numeric,p_date date,
  p_expected_payment_date date,p_notes text,p_account_id uuid,p_already_recorded boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); result uuid; begin
  if h is null or not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar préstamos'; end if;
  if p_debtor is null or length(trim(p_debtor)) not between 1 and 100 or p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
    or p_date is null or (p_expected_payment_date is not null and p_expected_payment_date<p_date) or p_already_recorded is null then raise exception 'Datos del préstamo inválidos'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived) then raise exception 'Cuenta o tarjeta no disponible'; end if;
  insert into public.loans(household_id,created_by,debtor,amount,date,expected_payment_date,notes,source_account_id,already_recorded)
    values(h,auth.uid(),p_debtor,p_amount,p_date,p_expected_payment_date,p_notes,p_account_id,p_already_recorded) returning id into result;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,loan_id,description)
    values(h,auth.uid(),'loan_out',p_amount,p_date,case when p_already_recorded then null else p_account_id end,result,'Préstamo a '||p_debtor);
  return result;
end $$;
create or replace function public.loan_repay(p_loan_id uuid,p_amount numeric,p_date date,p_account_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); result uuid; begin
  if not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar abonos'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived and type<>'credit_card') then raise exception 'Cuenta de depósito no disponible'; end if;
  perform 1 from public.loans where id=p_loan_id and household_id=h for update;
  if not found then raise exception 'Préstamo no disponible'; end if;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,loan_id,description)
    values(h,auth.uid(),'loan_repayment',p_amount,p_date,p_account_id,p_loan_id,'Abono de préstamo') returning id into result;
  return result;
end $$;
create function public.loan_update_source(p_loan_id uuid,p_account_id uuid,p_already_recorded boolean) returns void
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); initial_transaction uuid; begin
  if h is null or not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para corregir préstamos'; end if;
  if p_already_recorded is null or not exists(select 1 from public.accounts where id=p_account_id and household_id=h and not is_archived) then raise exception 'Cuenta o tarjeta no disponible'; end if;
  select id into initial_transaction from public.transactions
    where loan_id=p_loan_id and household_id=h and type='loan_out' order by date,created_at limit 1 for update;
  if initial_transaction is null then raise exception 'No se encontró la salida inicial del préstamo'; end if;
  update public.loans set source_account_id=p_account_id,already_recorded=p_already_recorded
    where id=p_loan_id and household_id=h and status<>'written_off';
  if not found then raise exception 'Préstamo activo o pagado no disponible'; end if;
  update public.transactions set account_id=case when p_already_recorded then null else p_account_id end
    where id=initial_transaction;
end $$;
create or replace function public.loan_snapshot(p_module public.module_name default 'loans') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; today date; begin
  if p_module not in ('loans','dashboard','reports') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar préstamos'; end if;
  select (now() at time zone timezone)::date into today from public.households where id=public.current_household_id();
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'debtor',l.debtor,'amount',l.amount,'date',l.date,
    'expected_payment_date',l.expected_payment_date,'notes',l.notes,'status',l.status,
    'source_account_id',l.source_account_id,'source_account_name',a.name,'source_account_type',a.type,
    'already_recorded',l.already_recorded,'lent',coalesce(t.lent,0),'recovered',coalesce(t.recovered,0),
    'pending',case when l.status='written_off' then 0 else greatest(coalesce(t.lent,0)-coalesce(t.recovered,0),0) end,
    'overdue',coalesce(l.status='active' and l.expected_payment_date<today and coalesce(t.lent,0)>coalesce(t.recovered,0),false)) order by l.date desc),'[]'::jsonb)
    into result from public.loans l left join public.accounts a on a.id=l.source_account_id and a.household_id=l.household_id
    left join lateral (select sum(amount) filter(where type='loan_out') lent,sum(amount) filter(where type='loan_repayment') recovered
      from public.transactions where loan_id=l.id and status='posted' and date<=today) t on true
    where l.household_id=public.current_household_id();
  return result;
end $$;
revoke all on function public.loan_create_with_balance_effect(text,numeric,date,date,text,uuid,boolean) from public;
revoke all on function public.loan_update_source(uuid,uuid,boolean) from public;
grant execute on function public.loan_create_with_balance_effect(text,numeric,date,date,text,uuid,boolean),public.loan_update_source(uuid,uuid,boolean) to authenticated;
