-- Si febrero acorta corte y pago al mismo día, el vencimiento pasa al mes siguiente.
create or replace function public.card_installment_schedule(p_card_id uuid,p_after date,p_until date)
returns table(plan_id uuid,card_id uuid,installment integer,close_date date,due_date date,amount numeric)
language sql stable security definer set search_path = '' as $$
  select p.id,p.card_id,n.i+1,dates.closes,
    due.month + least(a.payment_due_day,extract(day from (due.month+interval '1 month - 1 day'))::integer)-1,
    case when n.i=p.installments-1 then p.amount-trunc(p.amount*100/p.installments)/100*(p.installments-1)
      else trunc(p.amount*100/p.installments)/100 end
  from public.card_installment_plans p join public.accounts a on a.id=p.card_id
    cross join lateral generate_series(0,p.installments-1) n(i)
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
