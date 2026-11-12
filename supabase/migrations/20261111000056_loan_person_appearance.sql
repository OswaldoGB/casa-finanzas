alter table public.loan_people
  add column emoji text not null default '👤' check (char_length(emoji) between 1 and 32),
  add column color text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$');

create policy loan_people_update on public.loan_people for update to authenticated
  using (household_id = (select public.current_household_id()) and (select public.has_module_access('loans', 'edit')))
  with check (household_id = (select public.current_household_id()) and (select public.has_module_access('loans', 'edit')));
revoke update on public.loan_people from public, anon, authenticated;
grant update (emoji, color) on public.loan_people to authenticated;
