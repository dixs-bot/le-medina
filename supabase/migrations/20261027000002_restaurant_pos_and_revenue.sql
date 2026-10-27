-- POS kasir restoran dan laporan pendapatan restoran.
-- Jalankan setelah 20261027000001_restaurant_orders.sql di Supabase SQL Editor.
alter table public.restaurant_orders
  add column if not exists order_source text not null default 'online';

alter table public.restaurant_orders
  drop constraint if exists restaurant_orders_payment_method_check;
alter table public.restaurant_orders
  add constraint restaurant_orders_payment_method_check
  check (payment_method in ('restaurant','cash','transfer_dummy','qris_dummy'));

alter table public.restaurant_orders
  drop constraint if exists restaurant_orders_order_source_check;
alter table public.restaurant_orders
  add constraint restaurant_orders_order_source_check
  check (order_source in ('online','pos'));

create index if not exists idx_restaurant_orders_source_created
  on public.restaurant_orders(order_source, created_at desc);
create index if not exists idx_restaurant_orders_paid_revenue
  on public.restaurant_orders(payment_status, order_status, created_at desc);
