create function public.analytics_account_totals(p_date date, p_card_closes jsonb)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(a.id, jsonb_build_object(
    'balance', public.account_balance_on(a.id, p_date),
    'future_installments', case when a.type = 'credit_card' and p_card_closes is not null
      then public.card_unbilled_installments(a.id, p_date) else 0 end,
    'unpaid', case when a.type = 'credit_card' and not a.is_archived and p_card_closes ? a.id::text
      then public.card_statement_unpaid(a.id, (p_card_closes ->> a.id::text)::date, p_date)
      else 0 end
  )), '{}'::jsonb)
  from public.accounts a
  where a.household_id = (select public.current_household_id())
    and (select public.can_read_accounts());
$$;

revoke all on function public.analytics_account_totals(date, jsonb) from public, anon;
grant execute on function public.analytics_account_totals(date, jsonb) to authenticated;

create index notifications_unread_user_idx on public.user_notifications (user_id)
  where is_active and read_at is null;
