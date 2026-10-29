-- Abonos a una compra de la tarjeta: sigo una compra hecha con la tarjeta y le
-- voy abonando. Cada abono es un pago normal de tarjeta (pay_credit_card_and_settle:
-- mueve cuentas y concilia cortes) más un vínculo "este pago fue para esta compra".
-- Lo que falta se calcula al leer, así que corregir/borrar el pago nunca desincroniza.
create table public.card_purchase_tracks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  card_id uuid not null,
  transaction_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (card_id, household_id) references public.accounts(id, household_id),
  foreign key (transaction_id, household_id) references public.transactions(id, household_id) on delete cascade
);
create index card_purchase_tracks_card_idx on public.card_purchase_tracks (card_id);

create table public.card_purchase_track_payments (
  track_id uuid not null,
  household_id uuid not null,
  card_payment_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (track_id, card_payment_id),
  foreign key (track_id, household_id) references public.card_purchase_tracks(id, household_id) on delete cascade,
  foreign key (card_payment_id, household_id) references public.card_payments(id, household_id) on delete cascade
);
create index card_purchase_track_payments_payment_idx on public.card_purchase_track_payments (card_payment_id);

alter table public.card_purchase_tracks enable row level security;
alter table public.card_purchase_track_payments enable row level security;
create policy card_purchase_tracks_read on public.card_purchase_tracks for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts','view')));
create policy card_purchase_track_payments_read on public.card_purchase_track_payments for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts','view')));
grant select on public.card_purchase_tracks, public.card_purchase_track_payments to authenticated;

create function public.track_card_purchase(p_transaction_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); tx public.transactions; result uuid; begin
  if h is null or not public.has_module_access('accounts','edit') then raise exception 'Sin permiso para seguir compras'; end if;
  select t.* into tx from public.transactions t join public.accounts a on a.id=t.account_id and a.household_id=t.household_id
    where t.id=p_transaction_id and t.household_id=h and t.type='expense' and t.status='posted' and a.type='credit_card';
  if not found then raise exception 'Elige un gasto hecho con esta tarjeta'; end if;
  insert into public.card_purchase_tracks(household_id,created_by,card_id,transaction_id)
    values(h,auth.uid(),tx.account_id,tx.id)
    on conflict (transaction_id) do nothing returning id into result;
  return coalesce(result,(select id from public.card_purchase_tracks where transaction_id=tx.id));
end $$;

create function public.untrack_card_purchase(p_track_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.has_module_access('accounts','edit') then raise exception 'Sin permiso para dejar de seguir compras'; end if;
  -- Los pagos ya hechos a la tarjeta se conservan; solo se quita el seguimiento.
  delete from public.card_purchase_tracks where id=p_track_id and household_id=public.current_household_id();
end $$;

create function public.pay_tracked_purchase(p_id uuid,p_track_id uuid,p_date date,p_account_id uuid,p_amount numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); tr public.card_purchase_tracks; total numeric; paid numeric; begin
  if h is null or not(public.has_module_access('accounts','edit') and public.has_module_access('transactions','edit')) then
    raise exception 'Sin permiso para abonar'; end if;
  if p_id is null then raise exception 'Solicitud inválida'; end if;
  -- Reintento del mismo abono (doble toque): devolver el que ya existe.
  if exists(select 1 from public.card_purchase_track_payments where card_payment_id=p_id and track_id=p_track_id) then return p_id; end if;
  select * into tr from public.card_purchase_tracks where id=p_track_id and household_id=h for update;
  if not found then raise exception 'Compra en seguimiento no disponible'; end if;
  select amount into total from public.transactions where id=tr.transaction_id;
  select coalesce(sum(amount),0) into paid from public.card_purchase_track_payments where track_id=tr.id;
  if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then raise exception 'Monto inválido'; end if;
  if paid+p_amount>total then raise exception 'El abono supera lo que falta de esta compra'; end if;
  perform public.pay_credit_card_and_settle(p_id,tr.card_id,p_date,
    jsonb_build_array(jsonb_build_object('account_id',p_account_id,'amount',p_amount)));
  insert into public.card_purchase_track_payments(track_id,household_id,card_payment_id,amount)
    values(tr.id,h,p_id,p_amount) on conflict do nothing;
  return p_id;
end $$;

revoke all on function public.track_card_purchase(uuid), public.untrack_card_purchase(uuid),
  public.pay_tracked_purchase(uuid,uuid,date,uuid,numeric) from public, anon;
grant execute on function public.track_card_purchase(uuid), public.untrack_card_purchase(uuid),
  public.pay_tracked_purchase(uuid,uuid,date,uuid,numeric) to authenticated;
