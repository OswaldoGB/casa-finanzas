create function public.pay_credit_card_with_allocations(p_id uuid,p_card_id uuid,p_date date,p_sources jsonb,p_allocations jsonb default '[]')
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.pay_credit_card(p_id,p_card_id,p_date,p_sources);
  if coalesce(jsonb_array_length(p_allocations),0) > 0 then
    perform public.allocate_card_payment(p_id,p_allocations);
  end if;
  return p_id;
end $$;
revoke all on function public.pay_credit_card_with_allocations(uuid,uuid,date,jsonb,jsonb) from public;
grant execute on function public.pay_credit_card_with_allocations(uuid,uuid,date,jsonb,jsonb) to authenticated;
