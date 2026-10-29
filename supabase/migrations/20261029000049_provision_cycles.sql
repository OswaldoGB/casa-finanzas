-- Reservas de fondos: una provisión con calendario (cada quincena o cada mes)
-- que se reinicia desde 0 cuando se liga la compra del insumo.
alter table public.savings_goals
  add column cadence text check (cadence in ('quincenal', 'mensual')),
  add column cycle_start date,
  add column last_purchase_transaction_id uuid references public.transactions(id) on delete set null,
  add column last_purchase_date date,
  add constraint savings_goals_cadence_shape check (
    cadence is null or (type = 'provision' and target_date is not null and cycle_start is not null and target_date > cycle_start)
  );

-- Snapshot con lo necesario para "te toca apartar" (último aporte y ciclo).
create or replace function public.savings_snapshot(p_module public.module_name default 'savings') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
  if p_module not in ('savings','dashboard') or not public.has_module_access(p_module,'view') then raise exception 'Sin permiso para consultar ahorro'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'type',g.type,'target_amount',g.target_amount,
    'target_date',g.target_date,'account_id',g.account_id,'color',g.color,'icon',g.icon,'balance',coalesce(t.balance,0),
    'cadence',g.cadence,'cycle_start',g.cycle_start,'last_purchase_date',g.last_purchase_date,
    'last_contribution_date',t.last_contribution) order by g.created_at desc),'[]'::jsonb)
    into result from public.savings_goals g left join lateral (
      select sum(case when type='goal_contribution' then amount else -amount end) balance,
        max(date) filter (where type='goal_contribution') last_contribution
      from public.transactions where savings_goal_id=g.id and status='posted' and date <= (select (now() at time zone timezone)::date from public.households where id=g.household_id)) t on true
    where g.household_id=(select public.current_household_id());
  return result;
end $$;

-- "Ya lo compré": liga el gasto, usa lo apartado y reinicia el ciclo con la misma duración.
create function public.provision_restart(p_goal_id uuid, p_transaction_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare h uuid:=public.current_household_id(); goal public.savings_goals; tx public.transactions; bal numeric; span int; begin
  if h is null or not(public.has_module_access('savings','edit') and public.has_module_access('transactions','view')) then
    raise exception 'Sin permiso para reiniciar la reserva'; end if;
  select * into goal from public.savings_goals where id=p_goal_id and household_id=h for update;
  if not found or goal.type<>'provision' then raise exception 'Reserva no disponible'; end if;
  select * into tx from public.transactions where id=p_transaction_id and household_id=h and type='expense' and status='posted';
  if not found then raise exception 'Elige un gasto registrado'; end if;
  select coalesce(sum(case when type='goal_contribution' then amount else -amount end),0) into bal
    from public.transactions where savings_goal_id=goal.id and status='posted';
  if bal>0 then
    if goal.account_id is not null and (tx.account_id is null or tx.account_id=goal.account_id) then
      raise exception 'Retira primero el dinero de la cuenta de la reserva'; end if;
    insert into public.transactions(household_id,created_by,type,amount,date,account_id,destination_account_id,savings_goal_id,description)
      values(h,auth.uid(),'goal_withdrawal',bal,tx.date,goal.account_id,case when goal.account_id is null then null else tx.account_id end,
        goal.id,'Compra: '||coalesce(nullif(trim(tx.description),''),goal.name));
  end if;
  span:=case when goal.cycle_start is not null and goal.target_date is not null then goal.target_date-goal.cycle_start end;
  update public.savings_goals set
    last_purchase_transaction_id=tx.id, last_purchase_date=tx.date,
    cycle_start=case when span is not null then tx.date else cycle_start end,
    target_date=case when span is not null then tx.date+span else target_date end
  where id=goal.id;
end $$;
revoke all on function public.provision_restart(uuid, uuid) from public, anon;
grant execute on function public.provision_restart(uuid, uuid) to authenticated;
