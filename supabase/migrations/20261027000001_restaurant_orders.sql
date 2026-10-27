-- Le Medina restaurant ordering (run in Supabase SQL Editor)
create extension if not exists pgcrypto;
create table if not exists public.restaurant_orders (
 id uuid primary key default gen_random_uuid(),
 order_code text not null unique,
 customer_name text not null check (char_length(customer_name) between 2 and 120),
 room_number text,
 is_hotel_guest boolean not null default true,
 customer_note text not null default '',
 payment_method text not null check (payment_method in ('restaurant','transfer_dummy','qris_dummy')),
 payment_status text not null default 'pending' check (payment_status in ('pending','paid_at_restaurant','simulated')),
 order_status text not null default 'received' check (order_status in ('received','processing','ready','completed','cancelled')),
 total_idr bigint not null check (total_idr > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.restaurant_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.restaurant_orders(id) on delete cascade,
 menu_id uuid references public.restaurant_menu(id) on delete set null,
 menu_name text not null,
 quantity integer not null check (quantity between 1 and 99),
 unit_price_idr bigint not null check (unit_price_idr >= 0),
 line_total_idr bigint not null check (line_total_idr >= 0)
);
create index if not exists idx_restaurant_orders_created on public.restaurant_orders(created_at desc);
create index if not exists idx_restaurant_orders_code on public.restaurant_orders(order_code);
create index if not exists idx_restaurant_orders_status on public.restaurant_orders(order_status);
alter table public.restaurant_orders enable row level security;
alter table public.restaurant_order_items enable row level security;
drop policy if exists "No direct public restaurant order access" on public.restaurant_orders;
drop policy if exists "No direct public restaurant order item access" on public.restaurant_order_items;
-- Access goes through server API routes using service role. Do not add anon insert/select policies.
grant all on public.restaurant_orders, public.restaurant_order_items to service_role;
