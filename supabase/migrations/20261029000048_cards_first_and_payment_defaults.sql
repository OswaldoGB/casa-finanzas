-- 1) Tarjetas primero en todas las listas: orden estable calculado por la base.
alter table public.accounts
  add column sort_rank smallint generated always as (case when type = 'credit_card' then 0 else 1 end) stored;

-- 2) Catálogo base de métodos de pago (para hogares nuevos y forks): solo agrega
--    los tipos que falten; respeta lo que el hogar ya configuró.
create function public.seed_payment_methods(p_home uuid, p_user uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.payment_methods (household_id, created_by, name, type)
  select p_home, p_user, d.name, d.type::public.payment_method_type
  from (values
    ('Tarjeta de crédito', 'credit'),
    ('Tarjeta de débito', 'debit'),
    ('Transferencia bancaria', 'transfer'),
    ('Efectivo', 'cash')
  ) as d(name, type)
  where not exists (
    select 1 from public.payment_methods m
    where m.household_id = p_home and m.type = d.type::public.payment_method_type
  );
$$;
revoke all on function public.seed_payment_methods(uuid, uuid) from public, anon, authenticated;

create function public.seed_payment_methods_on_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'admin' then perform public.seed_payment_methods(new.household_id, new.id); end if;
  return new;
end $$;
revoke all on function public.seed_payment_methods_on_admin() from public;
create trigger profiles_seed_payment_methods after insert on public.profiles
  for each row execute function public.seed_payment_methods_on_admin();

select public.seed_payment_methods(p.household_id, p.id) from public.profiles p where p.role = 'admin';

-- 3) Fix: el guardián de aportes/retiros usaba `amount` sin calificar
--    ("column amount does not exist"), así que ningún aporte a metas se podía
--    guardar. Misma función, con row_t.amount.
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
    if TG_OP<>'DELETE' and row_t.status='posted' then net:=net+case when row_t.type='goal_contribution' then row_t.amount else -row_t.amount end; end if;
    if net<0 then raise exception 'El retiro supera el dinero apartado'; end if;
  end if;
  return row_t;
end $$;
