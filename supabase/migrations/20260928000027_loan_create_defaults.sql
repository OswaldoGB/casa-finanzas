-- Los parámetros opcionales conservan los mismos valores nulos que el formulario.
create or replace function public.loan_create_with_balance_effect(p_debtor text,p_amount numeric,p_date date,
  p_expected_payment_date date default null,p_notes text default null,p_account_id uuid default null,p_already_recorded boolean default false) returns uuid
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
