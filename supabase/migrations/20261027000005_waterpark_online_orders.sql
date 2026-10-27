-- Online Mini Waterpark ticket orders, customer validation code, and admin verification.
-- Run after 20261027000003_mini_waterpark_ticketing.sql.
create table if not exists public.waterpark_online_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default (
    'WPO-' || to_char(timezone('Asia/Jakarta', now()), 'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))
  ),
  validation_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  customer_name text not null check (char_length(trim(customer_name)) >= 2),
  adult_count integer not null default 0 check (adult_count >= 0),
  child_count integer not null default 0 check (child_count >= 0),
  adult_price_idr integer not null check (adult_price_idr > 0),
  child_price_idr integer not null check (child_price_idr > 0),
  total_idr integer not null check (total_idr > 0),
  payment_method text not null check (payment_method in ('transfer_dummy', 'qris_dummy', 'counter')),
  payment_status text not null default 'pending_payment' check (payment_status in ('pending_payment', 'pending_counter', 'paid')),
  order_status text not null default 'waiting_payment' check (order_status in ('waiting_payment', 'waiting_counter', 'confirmed', 'used', 'cancelled')),
  note text,
  paid_at timestamptz,
  validated_at timestamptz,
  validated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waterpark_online_at_least_one_ticket check (adult_count + child_count > 0),
  constraint waterpark_online_total_matches check (total_idr = adult_count * adult_price_idr + child_count * child_price_idr)
);
create index if not exists idx_waterpark_online_orders_created on public.waterpark_online_orders(created_at desc);
create index if not exists idx_waterpark_online_orders_status on public.waterpark_online_orders(order_status, payment_status);
create index if not exists idx_waterpark_online_orders_validation on public.waterpark_online_orders(validation_code);
alter table public.waterpark_online_orders enable row level security;
revoke all on public.waterpark_online_orders from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.waterpark_online_orders to service_role;
