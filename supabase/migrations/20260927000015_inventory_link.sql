-- El historial de la compra permanece aunque se retire el objeto del inventario.
alter table public.shopping_items drop constraint shopping_items_inventory_item_id_household_id_fkey;
alter table public.shopping_items add constraint shopping_items_inventory_item_id_household_id_fkey
  foreign key (inventory_item_id, household_id) references public.inventory_items(id, household_id)
  on delete set null (inventory_item_id);
