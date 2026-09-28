-- Editar un préstamo preservando sus abonos y el efecto correcto en el saldo.
create or replace function public.guard_loan_definition() returns trigger
language plpgsql security definer set search_path='' as $$
declare lent numeric; recovered numeric; begin
  if current_setting('casa_finanzas.loan_edit',true)='true' then return new; end if;
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

create function public.loan_update(p_loan_id uuid,p_debtor text,p_amount numeric,p_date date,
  p_expected_payment_date date,p_notes text,p_account_id uuid,p_already_recorded boolean) returns void
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); loan public.loans; initial_transaction uuid; begin
  if h is null or not(public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then raise exception 'Sin permiso para editar préstamos'; end if;
  select * into loan from public.loans where id=p_loan_id and household_id=h and status<>'written_off' for update;
  if not found then raise exception 'Préstamo activo o pagado no disponible'; end if;
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

revoke all on function public.loan_update(uuid,text,numeric,date,date,text,uuid,boolean) from public;
grant execute on function public.loan_update(uuid,text,numeric,date,date,text,uuid,boolean) to authenticated;
