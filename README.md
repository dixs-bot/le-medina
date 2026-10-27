# Mini Waterpark Online Ticket Orders patch

Patch for the existing Le Médina Next.js + Supabase project.

## Files
- `app/tiket-waterpark/page.tsx`: customer online ticket checkout and code-based status lookup.
- `app/api/waterpark/online/route.ts`: public ticket-price read, order creation using server-side Supabase admin client, and code-only status lookup.
- `app/admin/waterpark-online/page.tsx`: admin queue, payment confirmation, and one-time entrance validation UI.
- `app/api/admin/waterpark-online/route.ts`: authenticated admin endpoints.
- `app/admin/AdminDashboardClient.tsx`: adds admin navigation link to the online ticket queue.
- `supabase/migrations/20261027000005_waterpark_online_orders.sql`: database table and service-role grants.

## Install
1. Back up the current project.
2. Copy files into the matching paths; merge the modified `AdminDashboardClient.tsx` into the latest version if you have changed it since the Mini Waterpark patch.
3. Run the SQL migration in Supabase SQL Editor after the existing Mini Waterpark ticketing migration.
4. Ensure `SUPABASE_SERVICE_ROLE_KEY` is configured in Vercel server environment only. Never expose it to the browser.
5. Run `npm run build` and test in a preview deployment.

## URLs
- Customer checkout: `/tiket-waterpark`
- Admin online orders: `/admin/waterpark-online`

Transfer and QRIS are simulations; staff must confirm actual payment before marking paid. Counter payment orders also require staff confirmation. Entry validation is allowed only for paid orders and the code can be used once.
