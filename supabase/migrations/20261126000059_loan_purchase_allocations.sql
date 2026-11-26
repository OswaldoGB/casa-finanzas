create table public.loan_purchase_items (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  purchase_id uuid not null references public.transactions(id) on delete restrict,
  item_id uuid not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_cents bigint not null check (unit_cents > 0),
  unique (loan_id, purchase_id, item_id)
);
create index loan_purchase_items_source on public.loan_purchase_items(purchase_id, item_id);

create table public.loan_item_repayments (
  loan_item_id uuid not null references public.loan_purchase_items(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  primary key (loan_item_id, transaction_id)
);
create index loan_item_repayments_transaction on public.loan_item_repayments(transaction_id);

alter table public.loan_purchase_items enable row level security;
alter table public.loan_item_repayments enable row level security;
create policy loan_purchase_items_read on public.loan_purchase_items for select to authenticated
  using (public.has_module_access('loans', 'view') and exists (
    select 1 from public.loans l where l.id = loan_id and l.household_id = public.current_household_id()
  ));
create policy loan_item_repayments_read on public.loan_item_repayments for select to authenticated
  using (exists (select 1 from public.loan_purchase_items i where i.id = loan_item_id));
grant select on public.loan_purchase_items, public.loan_item_repayments to authenticated;

create function public.loan_create_from_purchases(
  p_person_id uuid, p_date date, p_expected_payment_date date, p_notes text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  h uuid := public.current_household_id();
  line record;
  purchase public.transactions;
  item jsonb;
  allocated bigint;
  account uuid;
  purchase_items_total numeric;
  total bigint := 0;
  selected jsonb := '[]'::jsonb;
  result uuid;
begin
  if h is null or not (public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then
    raise exception 'Sin permiso para vincular compras';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Selecciona los ítems del préstamo';
  end if;
  for line in
    select purchase_id, item_id, sum(quantity) quantity
    from jsonb_to_recordset(p_items) as i(purchase_id uuid, item_id uuid, quantity integer)
    group by purchase_id, item_id order by purchase_id, item_id
  loop
    select * into purchase from public.transactions
      where id = line.purchase_id and household_id = h and type = 'expense' and status = 'posted' for update;
    if not found then raise exception 'Compra no disponible'; end if;
    select sum((value->>'quantity')::numeric * (value->>'unitCents')::numeric)
      into purchase_items_total from jsonb_array_elements(purchase.purchase_items);
    if purchase_items_total > purchase.amount * 100 then
      raise exception 'El total de los ítems supera el monto de la compra';
    end if;
    select value into item from jsonb_array_elements(purchase.purchase_items) where value->>'id' = line.item_id::text;
    if not found or line.quantity is null or line.quantity <= 0 or (item->>'unitCents')::bigint <= 0 then
      raise exception 'Ítem o cantidad inválidos';
    end if;
    select coalesce(sum(quantity), 0) into allocated from public.loan_purchase_items
      where purchase_id = line.purchase_id and item_id = line.item_id;
    if line.quantity + allocated > (item->>'quantity')::integer then
      raise exception 'La cantidad supera las unidades disponibles en %', item->>'name';
    end if;
    account := coalesce(account, purchase.account_id);
    total := total + line.quantity * (item->>'unitCents')::bigint;
    selected := selected || jsonb_build_object(
      'purchase_id', purchase.id, 'item_id', line.item_id, 'name', item->>'name',
      'quantity', line.quantity, 'unit_cents', item->'unitCents'
    );
  end loop;
  result := public.loan_create_for_person(p_person_id, 'lent', total / 100.0, p_date, p_expected_payment_date, p_notes, account, true);
  insert into public.loan_purchase_items(loan_id, purchase_id, item_id, name, quantity, unit_cents)
    select result, purchase_id, item_id, name, quantity, unit_cents
    from jsonb_to_recordset(selected) as i(purchase_id uuid, item_id uuid, name text, quantity integer, unit_cents bigint);
  return result;
end $$;

create function public.loan_repay_items(
  p_loan_id uuid, p_date date, p_account_id uuid, p_items jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  line record;
  available bigint;
  total bigint := 0;
  result uuid;
begin
  if not (public.has_module_access('loans','edit') and public.has_module_access('transactions','edit')) then
    raise exception 'Sin permiso para registrar abonos';
  end if;
  perform 1 from public.loans where id = p_loan_id and household_id = public.current_household_id() and direction = 'lent' for update;
  if not found then raise exception 'Préstamo no disponible'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Selecciona los ítems que vas a abonar';
  end if;
  for line in select loan_item_id, sum(amount_cents) amount_cents
      from jsonb_to_recordset(p_items) as i(loan_item_id uuid, amount_cents bigint) group by loan_item_id
  loop
    select i.quantity * i.unit_cents - coalesce((select sum(r.amount_cents) from public.loan_item_repayments r where r.loan_item_id = i.id), 0)
      into available from public.loan_purchase_items i where i.id = line.loan_item_id and i.loan_id = p_loan_id;
    if not found or line.amount_cents is null or line.amount_cents <= 0 or line.amount_cents > available then
      raise exception 'El abono supera lo pendiente de un ítem o contiene un importe inválido';
    end if;
    total := total + line.amount_cents;
  end loop;
  perform set_config('casa_finanzas.loan_item_repayment', p_loan_id::text, true);
  result := public.loan_repay(p_loan_id, total / 100.0, p_date, p_account_id);
  insert into public.loan_item_repayments(loan_item_id, transaction_id, amount_cents)
    select loan_item_id, result, sum(amount_cents)
    from jsonb_to_recordset(p_items) as i(loan_item_id uuid, amount_cents bigint) group by loan_item_id;
  return result;
end $$;

create function public.guard_itemized_transactions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.type = 'loan_out' and exists (select 1 from public.loan_purchase_items where loan_id = old.loan_id) then
      raise exception 'La salida pertenece a un préstamo con compras vinculadas';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and new.type = 'loan_out'
    and (new.amount, new.status, new.account_id) is distinct from (old.amount, old.status, old.account_id)
    and exists (select 1 from public.loan_purchase_items where loan_id = old.loan_id) then
    raise exception 'El monto, origen y estado de esta salida provienen de las compras vinculadas';
  end if;
  if tg_op = 'UPDATE' and (
    (new.purchase_items, new.type, new.status, new.account_id) is distinct from
    (old.purchase_items, old.type, old.status, old.account_id)
  ) and exists (select 1 from public.loan_purchase_items where purchase_id = old.id) then
    raise exception 'Quita primero los vínculos del préstamo para cambiar los ítems o la cuenta de compra';
  end if;
  if tg_op = 'UPDATE' and new.amount is distinct from old.amount and new.type = 'expense'
    and new.amount * 100 < (select coalesce(sum((item->>'unitCents')::numeric * (item->>'quantity')::numeric), 0)
      from jsonb_array_elements(new.purchase_items) item) then
    raise exception 'El monto no puede ser menor que el total de ítems';
  end if;
  if new.type = 'loan_repayment'  and exists (select 1 from public.loan_purchase_items where loan_id = new.loan_id) then
    if tg_op = 'INSERT' and current_setting('casa_finanzas.loan_item_repayment', true) is distinct from new.loan_id::text then
      raise exception 'Selecciona los ítems para registrar el abono';
    end if;
    if tg_op = 'UPDATE' and (new.amount, new.status) is distinct from (old.amount, old.status) then
      raise exception 'Registra un nuevo abono para corregir sus importes por ítem';
    end if;
  end if;
  return new;
end $$;

create trigger guard_itemized_transactions before insert or update or delete on public.transactions
  for each row execute function public.guard_itemized_transactions();

create function public.guard_itemized_loans() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.loan_purchase_items where loan_id = old.id) then
    if (new.amount, new.already_recorded, new.source_account_id)
        is distinct from (old.amount, old.already_recorded, old.source_account_id) then
      raise exception 'El monto y origen del préstamo se definen por sus compras vinculadas';
    end if;
    if new.person_id is null then raise exception 'Selecciona una persona del catálogo'; end if;
  end if;
  return new;
end $$;
create trigger guard_itemized_loans before update on public.loans
  for each row execute function public.guard_itemized_loans();

revoke all on function public.loan_create_from_purchases(uuid,date,date,text,jsonb),
  public.loan_repay_items(uuid,date,uuid,jsonb) from public, anon;
grant execute on function public.loan_create_from_purchases(uuid,date,date,text,jsonb),
  public.loan_repay_items(uuid,date,uuid,jsonb) to authenticated;
-- Fill purchase lines from finalized shopping lists. Fractional shopping
-- quantities stay in the original receipt because this flow assigns whole units.
create function public.capture_shopping_purchase_items(p_purchase_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.transactions t
    set purchase_items = lines.items, purchase_place = coalesce(t.purchase_place, nullif(left(p.store_name, 120), ''))
    from public.shopping_list_purchases p
    cross join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'name', left(i.name, 120), 'quantity', i.quantity::integer,
        'unitCents', round(coalesce(i.real_price, i.estimated_price) * 100)::bigint
      ) order by i.sort_order, i.id) items,
        round(sum(i.quantity * coalesce(i.real_price, i.estimated_price)), 2) total
      from (
        select * from public.shopping_list_items
        where purchase_id = p.id and quantity between 1 and 100000 and quantity = trunc(quantity)
          and coalesce(real_price, estimated_price) between 0.01 and 1000000000
        order by sort_order, id limit 100
      ) i
    ) lines
    where p.id = p_purchase_id and t.id = p.transaction_id and lines.items is not null and lines.total <= t.amount
      and (t.purchase_items = '[]'::jsonb or not exists (
        select 1 from public.loan_purchase_items a where a.purchase_id = t.id
      ));
$$;

revoke all on function public.capture_shopping_purchase_items(uuid) from public, anon, authenticated;

create function public.refresh_shopping_purchase_items() returns trigger
language plpgsql security definer set search_path = '' as $$
declare purchase uuid;
begin
  for purchase in select distinct n.purchase_id from linked_items n join prior_items o using (id)
    where n.purchase_id is not null and n.purchase_id is distinct from o.purchase_id
  loop
    perform public.capture_shopping_purchase_items(purchase);
  end loop;
  return null;
end $$;

create trigger refresh_shopping_purchase_items after update on public.shopping_list_items
  referencing old table as prior_items new table as linked_items
  for each statement execute function public.refresh_shopping_purchase_items();

do $$ declare purchase uuid; begin
  for purchase in select id from public.shopping_list_purchases loop
    perform public.capture_shopping_purchase_items(purchase);
  end loop;
end $$;
create function public.assert_loan_purchases_removable(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_module_access('transactions','edit') then
    raise exception 'Sin permiso para borrar movimientos';
  end if;
  if exists (
    select 1 from public.transactions t where t.id = any(p_ids) and t.household_id = public.current_household_id()
      and (exists (select 1 from public.loan_purchase_items a where a.purchase_id = t.id)
        or (t.type = 'loan_out' and exists (select 1 from public.loan_purchase_items a where a.loan_id = t.loan_id)))
  ) then
    raise exception 'El movimiento pertenece a un préstamo con compras vinculadas y no se puede borrar';
  end if;
end $$;
revoke all on function public.assert_loan_purchases_removable(uuid[]) from public, anon;
grant execute on function public.assert_loan_purchases_removable(uuid[]) to authenticated;
