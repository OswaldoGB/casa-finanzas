alter table public.accounts
  add column institution text not null default 'other'
    check (institution in ('banco_agricola','bac','cuscatlan','davivienda','promerica','azul','hipotecario','atlantida','siman','other')),
  add column card_network text
    check (card_network is null or card_network in ('visa','mastercard','amex','siman','other')),
  add column card_product text,
  add column card_last_four text
    check (card_last_four is null or card_last_four ~ '^[0-9]{4}$');

update public.accounts
set institution = case
  when lower(name) like '%agrícola%' or lower(name) like '%agricola%' or lower(name) like '% ba%' then 'banco_agricola'
  when lower(name) like '%cuscatlán%' or lower(name) like '%cuscatlan%' then 'cuscatlan'
  when lower(name) like '%davivienda%' then 'davivienda'
  when lower(name) like '%promérica%' or lower(name) like '%promerica%' then 'promerica'
  when lower(name) like '%atlántida%' or lower(name) like '%atlantida%' then 'atlantida'
  when lower(name) like '%siman%' then 'siman'
  when lower(name) like '%bac%' then 'bac'
  when lower(name) like '%azul%' then 'azul'
  when lower(name) like '%hipotecario%' then 'hipotecario'
  else institution
end;

update public.accounts
set card_network = 'visa', card_product = 'dorada'
where type = 'credit_card'
  and institution = 'banco_agricola'
  and lower(name) like '%visa%'
  and (lower(name) like '%gold%' or lower(name) like '%dorada%');
