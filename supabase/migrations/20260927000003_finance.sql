-- Fase 2: catálogos y movimientos financieros.
create type public.account_type as enum ('cash', 'checking', 'savings', 'credit_card', 'investment', 'other');
create type public.payment_method_type as enum ('cash', 'debit', 'credit', 'transfer', 'other');
create type public.category_type as enum ('income', 'expense');
create type public.transaction_type as enum (
  'income', 'expense', 'transfer', 'loan_out', 'loan_repayment', 'goal_contribution', 'goal_withdrawal'
);
create type public.transaction_status as enum ('pending', 'posted');
create type public.recurring_frequency as enum ('weekly', 'biweekly', 'monthly', 'yearly');
create type public.recurring_mode as enum ('auto', 'confirm');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  type public.account_type not null,
  opening_balance numeric(14,2) not null default 0 check (opening_balance >= 0),
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'wallet' check (length(trim(icon)) between 1 and 60),
  is_archived boolean not null default false,
  credit_limit numeric(14,2),
  statement_closing_day smallint,
  payment_due_day smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  constraint accounts_card_fields check (
    (type = 'credit_card' and coalesce(credit_limit > 0, false)
      and coalesce(statement_closing_day between 1 and 31, false)
      and coalesce(payment_due_day between 1 and 31, false))
    or (type <> 'credit_card' and credit_limit is null and statement_closing_day is null and payment_due_day is null)
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  type public.category_type not null,
  parent_id uuid,
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'tag' check (length(trim(icon)) between 1 and 60),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (parent_id, household_id) references public.categories(id, household_id),
  check (parent_id is distinct from id)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  type public.payment_method_type not null,
  account_id uuid,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (account_id, household_id) references public.accounts(id, household_id)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  name text not null check (length(trim(name)) between 1 and 100),
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  account_id uuid,
  destination_account_id uuid,
  category_id uuid,
  payment_method_id uuid,
  description text not null default '' check (length(description) <= 240),
  notes text,
  project_id uuid,
  loan_id uuid,
  savings_goal_id uuid,
  frequency public.recurring_frequency not null,
  interval_count integer not null default 1 check (interval_count between 1 and 100),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  mode public.recurring_mode not null default 'confirm',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (account_id, household_id) references public.accounts(id, household_id),
  foreign key (destination_account_id, household_id) references public.accounts(id, household_id),
  foreign key (category_id, household_id) references public.categories(id, household_id),
  foreign key (payment_method_id, household_id) references public.payment_methods(id, household_id),
  check (end_date is null or end_date >= start_date),
  check (next_run_date >= start_date),
  check (end_date is null or next_run_date <= end_date or is_active = false),
  check (account_id is null or account_id is distinct from destination_account_id),
  check (
    (type = 'transfer' and account_id is not null and destination_account_id is not null and category_id is null)
    or (type in ('goal_contribution', 'goal_withdrawal') and savings_goal_id is not null
      and ((account_id is null and destination_account_id is null)
        or (account_id is not null and destination_account_id is not null)) and category_id is null)
    or (type in ('income', 'expense', 'loan_out', 'loan_repayment') and account_id is not null
      and destination_account_id is null and (type not in ('income', 'expense') or category_id is not null))
  ),
  check ((type in ('loan_out', 'loan_repayment')) = (loan_id is not null))
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  type public.transaction_type not null,
  status public.transaction_status not null default 'posted',
  amount numeric(14,2) not null check (amount > 0),
  date date not null,
  account_id uuid,
  destination_account_id uuid,
  category_id uuid,
  payment_method_id uuid,
  description text not null default '' check (length(description) <= 240),
  notes text,
  project_id uuid,
  loan_id uuid,
  savings_goal_id uuid,
  recurring_rule_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (account_id, household_id) references public.accounts(id, household_id),
  foreign key (destination_account_id, household_id) references public.accounts(id, household_id),
  foreign key (category_id, household_id) references public.categories(id, household_id),
  foreign key (payment_method_id, household_id) references public.payment_methods(id, household_id),
  foreign key (recurring_rule_id, household_id) references public.recurring_rules(id, household_id),
  check (account_id is null or account_id is distinct from destination_account_id),
  check (status <> 'pending' or recurring_rule_id is not null),
  check (
    (type = 'transfer' and account_id is not null and destination_account_id is not null and category_id is null)
    or (type in ('goal_contribution', 'goal_withdrawal') and savings_goal_id is not null
      and ((account_id is null and destination_account_id is null)
        or (account_id is not null and destination_account_id is not null)) and category_id is null)
    or (type in ('income', 'expense', 'loan_out', 'loan_repayment') and account_id is not null
      and destination_account_id is null and (type not in ('income', 'expense') or category_id is not null))
  ),
  check ((type in ('loan_out', 'loan_repayment')) = (loan_id is not null))
);

create unique index transactions_recurring_once_idx on public.transactions(recurring_rule_id, date)
  where recurring_rule_id is not null;

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null,
  transaction_id uuid not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/webp', 'application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (created_by, household_id) references public.profiles(id, household_id),
  foreign key (transaction_id, household_id) references public.transactions(id, household_id) on delete cascade,
  check (storage_path like household_id::text || '/' || transaction_id::text || '/%')
);

-- No se permite mover registros a otro hogar ni alterar su autor original.
create function public.finance_immutable_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.household_id is distinct from old.household_id
    or new.created_by is distinct from old.created_by then
    raise exception 'No se puede cambiar la identidad, el hogar o el autor';
  end if;
  return new;
end $$;
revoke all on function public.finance_immutable_identity() from public;

create function public.validate_finance_category() returns trigger
language plpgsql set search_path = '' as $$
declare category_kind public.category_type;
declare parent_kind public.category_type;
declare parent_parent uuid;
begin
  if TG_TABLE_NAME = 'categories' then
    if new.parent_id is not null then
      select c.type, c.parent_id into parent_kind, parent_parent
      from public.categories c where c.id = new.parent_id and c.household_id = new.household_id;
      if parent_kind is distinct from new.type or parent_parent is not null then
        raise exception 'La subcategoría debe compartir tipo y tener solo un nivel';
      end if;
      if exists (select 1 from public.categories c where c.parent_id = new.id) then
        raise exception 'Una categoría con subcategorías no puede pasar a ser subcategoría';
      end if;
    end if;
    if TG_OP = 'UPDATE' and old.type is distinct from new.type and
      (exists (select 1 from public.categories c where c.parent_id = new.id)
        or exists (select 1 from public.transactions t where t.category_id = new.id)
        or exists (select 1 from public.recurring_rules r where r.category_id = new.id)) then
      raise exception 'No se puede cambiar el tipo de una categoría en uso';
    end if;
  elsif new.category_id is not null then
    select c.type into category_kind from public.categories c
      where c.id = new.category_id and c.household_id = new.household_id;
    if (new.type = 'income' and category_kind is distinct from 'income')
      or (new.type = 'expense' and category_kind is distinct from 'expense')
      or new.type not in ('income', 'expense') then
      raise exception 'La categoría no corresponde al tipo de movimiento';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_finance_category() from public;

do $$
declare table_name text;
begin
  foreach table_name in array array['accounts', 'categories', 'payment_methods', 'recurring_rules', 'transactions', 'attachments'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('create trigger %I_identity before update on public.%I for each row execute function public.finance_immutable_identity()', table_name, table_name);
  end loop;
end $$;
create trigger categories_validate before insert or update on public.categories
  for each row execute function public.validate_finance_category();
create trigger recurring_rules_category_validate before insert or update on public.recurring_rules
  for each row execute function public.validate_finance_category();
create trigger transactions_category_validate before insert or update on public.transactions
  for each row execute function public.validate_finance_category();

create index accounts_household_idx on public.accounts(household_id);
create index categories_household_order_idx on public.categories(household_id, sort_order);
create index categories_parent_idx on public.categories(parent_id) where parent_id is not null;
create index payment_methods_household_idx on public.payment_methods(household_id);
create index recurring_rules_due_idx on public.recurring_rules(next_run_date) where is_active;
create index recurring_rules_household_idx on public.recurring_rules(household_id);
create index transactions_household_date_idx on public.transactions(household_id, date desc);
create index transactions_account_date_idx on public.transactions(account_id, date desc);
create index transactions_destination_date_idx on public.transactions(destination_account_id, date desc) where destination_account_id is not null;
create index transactions_category_date_idx on public.transactions(category_id, date desc) where category_id is not null;
create index transactions_method_idx on public.transactions(payment_method_id) where payment_method_id is not null;
create index attachments_transaction_idx on public.attachments(transaction_id);

-- Catálogos compartidos: módulos consumidores pueden leerlos, aun sin permiso de Configuración.
create function public.can_read_accounts() returns boolean language sql stable
set search_path = '' as $$
  select public.has_module_access('accounts', 'view') or public.has_module_access('dashboard', 'view')
    or public.has_module_access('transactions', 'view') or public.has_module_access('budgets', 'view')
    or public.has_module_access('projections', 'view') or public.has_module_access('reports', 'view')
    or public.has_module_access('shopping', 'view') or public.has_module_access('shopping_lists', 'view')
    or public.has_module_access('projects', 'view') or public.has_module_access('loans', 'view')
    or public.has_module_access('savings', 'view')
$$;
create function public.can_read_categories() returns boolean language sql stable
set search_path = '' as $$
  select public.has_module_access('transactions', 'view') or public.has_module_access('budgets', 'view')
    or public.has_module_access('projections', 'view') or public.has_module_access('reports', 'view')
    or public.has_module_access('shopping', 'view') or public.has_module_access('shopping_lists', 'view')
    or public.has_module_access('projects', 'view') or public.has_module_access('dashboard', 'view')
$$;
create function public.can_read_payment_methods() returns boolean language sql stable
set search_path = '' as $$
  select public.has_module_access('transactions', 'view') or public.has_module_access('reports', 'view')
    or public.has_module_access('shopping', 'view') or public.has_module_access('shopping_lists', 'view')
$$;

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.transactions enable row level security;
alter table public.attachments enable row level security;

create policy accounts_read on public.accounts for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.can_read_accounts()));
create policy accounts_insert on public.accounts for insert to authenticated
  with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid())
    and (select public.has_module_access('accounts', 'edit')));
create policy accounts_update on public.accounts for update to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'edit')))
  with check (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'edit')));
create policy accounts_delete on public.accounts for delete to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'edit')));

create policy categories_read on public.categories for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.can_read_categories()));
create policy categories_insert on public.categories for insert to authenticated
  with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid()) and (select public.is_admin()));
create policy categories_update on public.categories for update to authenticated
  using (household_id = (select public.current_household_id()) and (select public.is_admin()))
  with check (household_id = (select public.current_household_id()) and (select public.is_admin()));
create policy categories_delete on public.categories for delete to authenticated
  using (household_id = (select public.current_household_id()) and (select public.is_admin()));

create policy payment_methods_read on public.payment_methods for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.can_read_payment_methods()));
create policy payment_methods_insert on public.payment_methods for insert to authenticated
  with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid()) and (select public.is_admin()));
create policy payment_methods_update on public.payment_methods for update to authenticated
  using (household_id = (select public.current_household_id()) and (select public.is_admin()))
  with check (household_id = (select public.current_household_id()) and (select public.is_admin()));
create policy payment_methods_delete on public.payment_methods for delete to authenticated
  using (household_id = (select public.current_household_id()) and (select public.is_admin()));

create policy recurring_rules_read on public.recurring_rules for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'view')));
create policy recurring_rules_insert on public.recurring_rules for insert to authenticated
  with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid())
    and (select public.has_module_access('transactions', 'edit')));
create policy recurring_rules_update on public.recurring_rules for update to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')))
  with check (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')));
create policy recurring_rules_delete on public.recurring_rules for delete to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')));

create policy transactions_read on public.transactions for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'view')));
create policy transactions_insert on public.transactions for insert to authenticated
  with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid())
    and (select public.has_module_access('transactions', 'edit')));
create policy transactions_update on public.transactions for update to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')))
  with check (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')));
create policy transactions_delete on public.transactions for delete to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')));

create policy attachments_read on public.attachments for select to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'view')));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (household_id = (select public.current_household_id()) and created_by = (select auth.uid())
    and (select public.has_module_access('transactions', 'edit')));
create policy attachments_update on public.attachments for update to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')))
  with check (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')));
create policy attachments_delete on public.attachments for delete to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('transactions', 'edit')));

-- Balance positivo de tarjeta = deuda. Las transacciones pendientes no afectan saldo.
create function public.account_balances()
returns table(account_id uuid, balance numeric(14,2))
language sql stable security definer set search_path = '' as $$
  with movement as (
    select t.account_id as id,
      case t.type
        when 'income' then t.amount
        when 'loan_repayment' then t.amount
        when 'expense' then -t.amount
        when 'loan_out' then -t.amount
        when 'transfer' then -t.amount
        when 'goal_contribution' then -t.amount
        when 'goal_withdrawal' then -t.amount
      end as delta
    from public.transactions t
    where t.household_id = public.current_household_id() and t.status = 'posted'
      and t.account_id is not null
    union all
    select t.destination_account_id, t.amount
    from public.transactions t
    where t.household_id = public.current_household_id() and t.status = 'posted'
      and t.destination_account_id is not null
  )
  select a.id, (a.opening_balance + case when a.type = 'credit_card'
    then -coalesce(sum(m.delta), 0) else coalesce(sum(m.delta), 0) end)::numeric(14,2)
  from public.accounts a left join movement m on m.id = a.id
  where a.household_id = public.current_household_id() and public.can_read_accounts()
  group by a.id, a.opening_balance, a.type
$$;
revoke all on function public.account_balances() from public;
grant execute on function public.account_balances() to authenticated;

-- Recibos privados. Ruta obligatoria: <household_id>/<transaction_id>/<archivo>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy receipts_read on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (select public.has_module_access('transactions', 'view'))
    and exists (select 1 from public.transactions t
      where t.household_id = (select public.current_household_id())
        and t.household_id::text = (storage.foldername(name))[1]
        and t.id::text = (storage.foldername(name))[2]));
create policy receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (select public.has_module_access('transactions', 'edit'))
    and exists (select 1 from public.transactions t
      where t.household_id = (select public.current_household_id())
        and t.household_id::text = (storage.foldername(name))[1]
        and t.id::text = (storage.foldername(name))[2]));
create policy receipts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (select public.has_module_access('transactions', 'edit'))
    and exists (select 1 from public.transactions t
      where t.household_id = (select public.current_household_id())
        and t.household_id::text = (storage.foldername(name))[1]
        and t.id::text = (storage.foldername(name))[2]));

-- Categorías editables por defecto para hogares existentes y futuros.
create function public.seed_finance_categories() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'admin' then
    insert into public.categories (household_id, created_by, name, type, color, icon, sort_order)
    values
      (new.household_id, new.id, 'Salario', 'income', '#2563eb', 'briefcase-business', 1),
      (new.household_id, new.id, 'Honorarios y freelance', 'income', '#7c3aed', 'landmark', 2),
      (new.household_id, new.id, 'Ventas', 'income', '#0891b2', 'shopping-bag', 3),
      (new.household_id, new.id, 'Inversiones', 'income', '#16a34a', 'trending-up', 4),
      (new.household_id, new.id, 'Reembolsos', 'income', '#0d9488', 'rotate-ccw', 5),
      (new.household_id, new.id, 'Regalos', 'income', '#db2777', 'gift', 6),
      (new.household_id, new.id, 'Otros ingresos', 'income', '#64748b', 'circle-plus', 7),
      (new.household_id, new.id, 'Supermercado', 'expense', '#ea580c', 'shopping-cart', 1),
      (new.household_id, new.id, 'Comida fuera', 'expense', '#f97316', 'utensils', 2),
      (new.household_id, new.id, 'Vivienda', 'expense', '#a16207', 'house', 3),
      (new.household_id, new.id, 'Servicios', 'expense', '#0284c7', 'receipt', 4),
      (new.household_id, new.id, 'Transporte', 'expense', '#2563eb', 'car', 5),
      (new.household_id, new.id, 'Salud', 'expense', '#dc2626', 'heart-pulse', 6),
      (new.household_id, new.id, 'Educación', 'expense', '#7c3aed', 'graduation-cap', 7),
      (new.household_id, new.id, 'Entretenimiento', 'expense', '#db2777', 'clapperboard', 8),
      (new.household_id, new.id, 'Suscripciones', 'expense', '#4f46e5', 'smartphone', 9),
      (new.household_id, new.id, 'Compras personales', 'expense', '#c2410c', 'shopping-bag', 10),
      (new.household_id, new.id, 'Ropa y cuidado personal', 'expense', '#e11d48', 'shirt', 11),
      (new.household_id, new.id, 'Mascotas', 'expense', '#65a30d', 'paw-print', 12),
      (new.household_id, new.id, 'Regalos y donaciones', 'expense', '#be185d', 'gift', 13),
      (new.household_id, new.id, 'Viajes', 'expense', '#0e7490', 'plane', 14),
      (new.household_id, new.id, 'Deudas y comisiones', 'expense', '#b45309', 'hand-coins', 15),
      (new.household_id, new.id, 'Impuestos', 'expense', '#475569', 'file-text', 16),
      (new.household_id, new.id, 'Otros gastos', 'expense', '#64748b', 'ellipsis', 17);
  end if;
  return new;
end $$;
revoke all on function public.seed_finance_categories() from public;
create trigger profiles_seed_finance_categories after insert on public.profiles
  for each row execute function public.seed_finance_categories();
insert into public.categories (household_id, created_by, name, type, icon, sort_order)
select p.household_id, p.id, defaults.name, defaults.type::public.category_type, defaults.icon, defaults.sort_order
from public.profiles p cross join (values
  ('Salario', 'income', 'briefcase-business', 1),
  ('Otros ingresos', 'income', 'circle-plus', 2),
  ('Supermercado', 'expense', 'shopping-cart', 3),
  ('Vivienda', 'expense', 'house', 4),
  ('Servicios', 'expense', 'receipt', 5),
  ('Transporte', 'expense', 'car', 6),
  ('Salud', 'expense', 'heart-pulse', 7),
  ('Educación', 'expense', 'graduation-cap', 8),
  ('Entretenimiento', 'expense', 'clapperboard', 9),
  ('Otros gastos', 'expense', 'ellipsis', 10)
) as defaults(name, type, icon, sort_order)
where p.role = 'admin' and not exists (
  select 1 from public.categories c where c.household_id = p.household_id
);
