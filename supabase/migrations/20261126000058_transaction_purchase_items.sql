alter table public.transactions
  add column purchase_place text check (char_length(purchase_place) <= 120),
  add column purchase_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(purchase_items) = 'array');
