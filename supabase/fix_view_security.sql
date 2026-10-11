-- ============================================================
-- Space Ledger — Fix: wallet_portfolio SECURITY DEFINER warning
-- ============================================================
-- Run this in Supabase → SQL Editor if you already ran schema.sql
-- and are seeing the "SECURITY DEFINER view" advisor warning.
--
-- This drops and recreates the view with SECURITY INVOKER (the default
-- and correct behaviour). The view will now respect RLS policies on the
-- underlying `blocks` table, queried as the calling user, not as the
-- view creator.
-- ============================================================

drop view if exists public.wallet_portfolio;

create or replace view public.wallet_portfolio
  with (security_invoker = true)
as
select
  owner_address,
  count(*)                                                           as total_blocks,
  count(*) * 100                                                     as total_pixels,
  sum(purchase_price)                                                as total_invested,
  sum(coalesce(current_price, purchase_price))                       as current_value,
  sum(coalesce(current_price, purchase_price)) - sum(purchase_price) as unrealized_pnl
from public.blocks
group by owner_address;

-- Verify: this query should return zero rows (no SECURITY DEFINER views)
select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
  and viewname   = 'wallet_portfolio'
  and definition ilike '%security_definer%';

-- If the above returns no rows, the warning is resolved.
