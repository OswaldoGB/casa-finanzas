-- FOR SHARE consulta también la política de UPDATE de la categoría. Un miembro
-- que puede registrar movimientos no puede editar catálogos; el trigger necesita
-- leer y bloquear la referencia del mismo hogar sin depender de ese permiso.
alter function public.validate_finance_category() security definer;
revoke all on function public.validate_finance_category() from public;
