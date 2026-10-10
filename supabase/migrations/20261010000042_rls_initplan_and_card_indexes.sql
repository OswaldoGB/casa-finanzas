-- Rendimiento: envolver funciones de RLS en (select ...) para que Postgres las
-- evalúe una vez por consulta (initPlan) y no por fila, e indexar las tablas de
-- tarjetas por las columnas que filtran las políticas y las consultas.
-- Sin cambios de semántica: mismas condiciones, mismos nombres de política.

alter policy "miembros ven su hogar" on public.households
  using (id = (select public.current_household_id()));
alter policy "admin edita su hogar" on public.households
  using (id = (select public.current_household_id()) and (select public.is_admin()));

alter policy "miembros ven perfiles del hogar" on public.profiles
  using (household_id = (select public.current_household_id()));

alter policy "miembro ve sus permisos y admin los del hogar" on public.module_permissions
  using (household_id = (select public.current_household_id()) and (user_id = (select auth.uid()) or (select public.is_admin())));
alter policy "admin asigna permisos de su hogar" on public.module_permissions
  with check (household_id = (select public.current_household_id()) and (select public.is_admin()) and created_by = (select auth.uid()));
alter policy "admin actualiza permisos de su hogar" on public.module_permissions
  using (household_id = (select public.current_household_id()) and (select public.is_admin()))
  with check (household_id = (select public.current_household_id()) and (select public.is_admin()) and created_by = (select auth.uid()));
alter policy "admin elimina permisos de su hogar" on public.module_permissions
  using (household_id = (select public.current_household_id()) and (select public.is_admin()));

alter policy card_plans_read on public.card_installment_plans
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'view')));
alter policy card_payments_read on public.card_payments
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'view')));
alter policy card_statements_read on public.card_statements
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'view')));
alter policy card_statement_allocations_read on public.card_statement_allocations
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'view')));
alter policy card_statement_installments_read on public.card_statement_installments
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'view')));
alter policy card_installment_payment_allocations_read on public.card_installment_payment_allocations
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('accounts', 'view')));

-- Índices: consultas por hogar (dashboard, proyecciones) y por tarjeta (detalle).
create index if not exists card_statements_household_due_idx on public.card_statements (household_id, due_on);
create index if not exists card_payments_card_date_idx on public.card_payments (card_id, date desc);
create index if not exists card_payments_household_idx on public.card_payments (household_id);
create index if not exists card_plans_household_idx on public.card_installment_plans (household_id);
create index if not exists card_statement_allocations_payment_idx on public.card_statement_allocations (card_payment_id);
create index if not exists card_installment_payment_allocations_payment_idx on public.card_installment_payment_allocations (card_payment_id);
-- Detalle de movimiento: ¿qué compra/inventario/lista quedó vinculada?
create index if not exists inventory_items_transaction_idx on public.inventory_items (transaction_id) where transaction_id is not null;
create index if not exists shopping_items_transaction_idx on public.shopping_items (transaction_id) where transaction_id is not null;
create index if not exists shopping_lists_transaction_idx on public.shopping_lists (transaction_id) where transaction_id is not null;
