-- Mini Waterpark ticketing and revenue.
-- Run in Supabase SQL Editor. API access is server-side and uses the service role.
create table if not exists public.waterpark_ticket_prices (
  ticket_type text primary key check (ticket_type in ('adult', 'child')),
  label text not null,
  price_idr integer not null check (price_idr > 0),
  updated_at timestamptz not null default now()
);

insert into public.waterpark_ticket_prices (ticket_type, label, price_idr)
values ('adult', 'Dewasa', 25000), ('child', 'Anak-anak', 2000)
on conflict (ticket_type) do nothing;

create table if not exists public.waterpark_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique default (
    'WP-' || to_char(timezone('Asia/Jakarta', now()), 'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  ),
  customer_name text not null check (char_length(trim(customer_name)) >= 2),
  adult_count integer not null default 0 check (adult_count >= 0),
  child_count integer not null default 0 check (child_count >= 0),
  adult_price_idr integer not null check (adult_price_idr > 0),
  child_price_idr integer not null check (child_price_idr > 0),
  total_idr integer not null check (total_idr >= 0),
  payment_method text not null check (payment_method in ('cash', 'transfer_dummy', 'qris_dummy')),
  payment_status text not null default 'simulated' check (payment_status in ('paid', 'simulated')),
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint waterpark_at_least_one_ticket check (adult_count + child_count > 0),
  constraint waterpark_total_matches check (total_idr = adult_count * adult_price_idr + child_count * child_price_idr)
);

create index if not exists idx_waterpark_transactions_created_at
  on public.waterpark_transactions (created_at desc);
create index if not exists idx_waterpark_transactions_payment_created
  on public.waterpark_transactions (payment_status, created_at desc);

alter table public.waterpark_ticket_prices enable row level security;
alter table public.waterpark_transactions enable row level security;
revoke all on public.waterpark_ticket_prices from anon, authenticated;
revoke all on public.waterpark_transactions from anon, authenticated;
