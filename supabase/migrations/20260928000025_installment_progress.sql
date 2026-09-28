-- Guarda el avance anterior sin recrear gastos ni pagos históricos.
alter table public.card_installment_plans add column paid_installments smallint not null default 0;
alter table public.card_installment_plans add column original_amount numeric(14,2);
alter table public.card_installment_plans add constraint card_plan_progress_valid
  check (paid_installments >= 0 and installments + paid_installments <= 120
    and (original_amount is null or (original_amount >= amount and original_amount > 0)));

create function public.create_card_installment_with_progress(p_id uuid,p_card_id uuid,p_name text,p_amount numeric,
  p_installments integer,p_paid_installments integer,p_amount_mode text,p_purchase_date date,p_first_close date,
  p_existing boolean,p_category_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare pending_amount numeric;
declare monthly numeric;
begin
  if public.current_household_id() is null or not public.has_module_access('accounts','edit')
    or (not p_existing and not public.has_module_access('transactions','edit')) then
    raise exception 'Sin permiso para registrar compras a plazos' using errcode='42501'; end if;
  if p_id is null or p_existing is null or p_paid_installments is null or p_paid_installments < 0
    or p_installments is null or p_installments not between 1 and 120 or p_paid_installments >= p_installments
    or (not p_existing and p_paid_installments <> 0) or p_amount_mode is null or p_amount_mode not in ('original','remaining')
    or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2) or p_amount > 999999999999.99 then
    raise exception 'Importe o avance de cuotas inválido'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  if exists(select 1 from public.card_installment_plans where id=p_id and household_id=public.current_household_id() and created_by=auth.uid()) then return p_id; end if;
  monthly := trunc(p_amount*100/case when p_amount_mode='original' then p_installments else p_installments-p_paid_installments end)/100;
  if monthly < 0.01 then raise exception 'Cada cuota debe ser de al menos un centavo'; end if;
  pending_amount := case when p_amount_mode='original' then p_amount-monthly*p_paid_installments else p_amount end;
  perform public.create_card_installment(p_id,p_card_id,p_name,pending_amount,p_installments-p_paid_installments,
    p_purchase_date,p_first_close,p_existing,p_category_id);
  update public.card_installment_plans set paid_installments=p_paid_installments,
    original_amount=case when p_amount_mode='original' then p_amount else null end where id=p_id;
  return p_id;
end $$;
revoke all on function public.create_card_installment_with_progress(uuid,uuid,text,numeric,integer,integer,text,date,date,boolean,uuid) from public;
grant execute on function public.create_card_installment_with_progress(uuid,uuid,text,numeric,integer,integer,text,date,date,boolean,uuid) to authenticated;

create or replace function public.card_installment_schedule(p_card_id uuid,p_after date,p_until date)
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
  where p.card_id=p_card_id and p.household_id=public.current_household_id() and public.can_read_accounts()
    and dates.closes>p_after and dates.closes<=p_until
  order by p.id,n.i
$$;
