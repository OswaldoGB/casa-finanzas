-- Catálogo estándar más amplio, con color e ícono para hogares existentes.
with defaults(name, type, color, icon, sort_order) as (
  values
    ('Salario', 'income', '#2563eb', 'briefcase-business', 1),
    ('Honorarios y freelance', 'income', '#7c3aed', 'landmark', 2),
    ('Ventas', 'income', '#0891b2', 'shopping-bag', 3),
    ('Inversiones', 'income', '#16a34a', 'trending-up', 4),
    ('Reembolsos', 'income', '#0d9488', 'rotate-ccw', 5),
    ('Regalos', 'income', '#db2777', 'gift', 6),
    ('Otros ingresos', 'income', '#64748b', 'circle-plus', 7),
    ('Supermercado', 'expense', '#ea580c', 'shopping-cart', 1),
    ('Comida fuera', 'expense', '#f97316', 'utensils', 2),
    ('Vivienda', 'expense', '#a16207', 'house', 3),
    ('Servicios', 'expense', '#0284c7', 'receipt', 4),
    ('Transporte', 'expense', '#2563eb', 'car', 5),
    ('Salud', 'expense', '#dc2626', 'heart-pulse', 6),
    ('Educación', 'expense', '#7c3aed', 'graduation-cap', 7),
    ('Entretenimiento', 'expense', '#db2777', 'clapperboard', 8),
    ('Suscripciones', 'expense', '#4f46e5', 'smartphone', 9),
    ('Compras personales', 'expense', '#c2410c', 'shopping-bag', 10),
    ('Ropa y cuidado personal', 'expense', '#e11d48', 'shirt', 11),
    ('Mascotas', 'expense', '#65a30d', 'paw-print', 12),
    ('Regalos y donaciones', 'expense', '#be185d', 'gift', 13),
    ('Viajes', 'expense', '#0e7490', 'plane', 14),
    ('Deudas y comisiones', 'expense', '#b45309', 'hand-coins', 15),
    ('Impuestos', 'expense', '#475569', 'file-text', 16),
    ('Otros gastos', 'expense', '#64748b', 'ellipsis', 17)
), admins as (
  select distinct on (household_id) household_id, id
  from public.profiles
  where role = 'admin'
  order by household_id, created_at
)
insert into public.categories (household_id, created_by, name, type, color, icon, sort_order)
select admins.household_id, admins.id, defaults.name, defaults.type::public.category_type,
       defaults.color, defaults.icon, defaults.sort_order
from admins cross join defaults
where not exists (
  select 1 from public.categories category
  where category.household_id = admins.household_id
    and lower(category.name) = lower(defaults.name)
    and category.type = defaults.type::public.category_type
);

with defaults(name, type, color, icon, sort_order) as (
  values
    ('Salario', 'income', '#2563eb', 'briefcase-business', 1),
    ('Otros ingresos', 'income', '#64748b', 'circle-plus', 7),
    ('Supermercado', 'expense', '#ea580c', 'shopping-cart', 1),
    ('Vivienda', 'expense', '#a16207', 'house', 3),
    ('Servicios', 'expense', '#0284c7', 'receipt', 4),
    ('Transporte', 'expense', '#2563eb', 'car', 5),
    ('Salud', 'expense', '#dc2626', 'heart-pulse', 6),
    ('Educación', 'expense', '#7c3aed', 'graduation-cap', 7),
    ('Entretenimiento', 'expense', '#db2777', 'clapperboard', 8),
    ('Otros gastos', 'expense', '#64748b', 'ellipsis', 17)
)
update public.categories category
set color = defaults.color, icon = defaults.icon, sort_order = defaults.sort_order
from defaults
where lower(category.name) = lower(defaults.name)
  and category.type = defaults.type::public.category_type
  and category.parent_id is null;
