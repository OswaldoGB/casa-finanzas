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
      elsif row_t.account_id is null and row_t.destination_account_id is null then
        null; -- Apartado dentro de la misma cuenta: no hay transferencia.
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

create or replace function public.savings_goal_operation(p_goal_id uuid,p_type public.transaction_type,
  p_amount numeric,p_date date,p_counterparty_account_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); goal public.savings_goals; result uuid; src uuid; dst uuid; begin
  if not(public.has_module_access('savings','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para registrar aportes o retiros'; end if;
  if p_type not in ('goal_contribution','goal_withdrawal') then raise exception 'Operación no válida'; end if;
  select * into goal from public.savings_goals where id=p_goal_id and household_id=h for update;
  if not found then raise exception 'Apartado no disponible'; end if;
  if goal.account_id is not null then
    if p_counterparty_account_id is null then raise exception 'Selecciona una cuenta disponible'; end if;
    if p_counterparty_account_id=goal.account_id then
      if not exists(select 1 from public.accounts where id=goal.account_id and household_id=h and not is_archived and type <> 'credit_card') then raise exception 'Cuenta no disponible'; end if;
      src:=null; dst:=null;
    else
      if (select count(*) from public.accounts where id in (goal.account_id,p_counterparty_account_id) and household_id=h and not is_archived and type <> 'credit_card')<>2 then raise exception 'Selecciona dos cuentas disponibles distintas'; end if;
      src:=case when p_type='goal_contribution' then p_counterparty_account_id else goal.account_id end;
      dst:=case when p_type='goal_contribution' then goal.account_id else p_counterparty_account_id end;
    end if;
  elsif p_counterparty_account_id is not null then raise exception 'El apartado virtual no utiliza cuentas';
  end if;
  insert into public.transactions(household_id,created_by,type,amount,date,account_id,destination_account_id,savings_goal_id,description)
    values(h,auth.uid(),p_type,p_amount,p_date,src,dst,goal.id,goal.name) returning id into result;
  return result;
end $$;
