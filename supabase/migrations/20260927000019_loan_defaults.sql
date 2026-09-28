create or replace function public.loan_create(p_debtor text,p_amount numeric,p_date date,
  p_expected_payment_date date default null,p_notes text default '',p_account_id uuid default null) returns uuid
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

