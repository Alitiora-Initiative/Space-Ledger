-- ============================================================
-- Space Ledger — Supabase Schema
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. wallets
--    One row per connected wallet address.
-- ────────────────────────────────────────────────────────────
create table if not exists wallets (
  id            uuid primary key default uuid_generate_v4(),
  address       text not null unique,          -- lowercase hex (EVM) or base58 (Solana)
  wallet_type   text not null default 'evm',   -- 'evm' | 'solana'
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. blocks
--    One row per block purchase event.
-- ────────────────────────────────────────────────────────────
create table if not exists blocks (
  id              uuid primary key default uuid_generate_v4(),
  block_id        bigint not null,              -- 0 .. 9_999_999_999
  owner_address   text not null,
  purchase_price  numeric(18,9) not null,       -- USD at bonding curve at time of purchase
  current_price   numeric(18,9),                -- updated by server periodically
  network         text not null default 'demo', -- 'solana-devnet' | 'solana-mainnet' | 'base' | 'demo'
  tx_signature    text,                         -- on-chain tx hash / signature
  purchased_at    timestamptz not null default now(),

  constraint blocks_block_id_unique unique (block_id)
);

-- Index for fast per-wallet queries
create index if not exists idx_blocks_owner on blocks(owner_address);
create index if not exists idx_blocks_block_id on blocks(block_id);

-- ────────────────────────────────────────────────────────────
-- 3. transactions
--    Full audit log of every purchase event.
-- ────────────────────────────────────────────────────────────
create table if not exists transactions (
  id              uuid primary key default uuid_generate_v4(),
  wallet_address  text not null,
  block_id_start  bigint not null,
  block_count     int not null default 1,
  total_price     numeric(18,9) not null,
  fee_collected   numeric(18,9) not null default 0.10,
  network         text not null,
  tx_signature    text,
  status          text not null default 'pending',  -- 'pending' | 'confirmed' | 'failed'
  created_at      timestamptz not null default now()
);

create index if not exists idx_transactions_wallet on transactions(wallet_address);

-- ────────────────────────────────────────────────────────────
-- 4. treasury_releases
--    Records every vesting release event.
-- ────────────────────────────────────────────────────────────
create table if not exists treasury_releases (
  id              uuid primary key default uuid_generate_v4(),
  recipient       text not null,
  amount_blocks   bigint not null,
  vesting_pct     numeric(5,2) not null,
  released_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 5. fees
--    Running ledger of platform fees collected.
-- ────────────────────────────────────────────────────────────
create table if not exists fees (
  id              uuid primary key default uuid_generate_v4(),
  amount          numeric(18,9) not null default 0.10,
  currency        text not null default 'USDC',
  source_tx       text,                          -- references transactions.id
  collected_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 6. pixel_metadata  (optional — for future pixel art content)
--    Stores user-uploaded content for individual pixels.
-- ────────────────────────────────────────────────────────────
create table if not exists pixel_metadata (
  id              uuid primary key default uuid_generate_v4(),
  global_pixel_id bigint not null unique,        -- block_id * 100 + pixel_index
  block_id        bigint not null,
  pixel_index     int not null check (pixel_index >= 0 and pixel_index < 100),
  owner_address   text not null,
  color_hex       char(7),                       -- e.g. '#ff0000'
  image_url       text,
  link_url        text,
  updated_at      timestamptz not null default now()
);

create index if not exists idx_pixel_block on pixel_metadata(block_id);

-- ────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- Users can read everything but only insert/update their own rows.
-- ────────────────────────────────────────────────────────────
alter table wallets          enable row level security;
alter table blocks           enable row level security;
alter table transactions     enable row level security;
alter table treasury_releases enable row level security;
alter table fees             enable row level security;
alter table pixel_metadata   enable row level security;

-- Public read on everything
create policy "public read wallets"          on wallets          for select using (true);
create policy "public read blocks"           on blocks           for select using (true);
create policy "public read transactions"     on transactions     for select using (true);
create policy "public read treasury"         on treasury_releases for select using (true);
create policy "public read fees"             on fees             for select using (true);
create policy "public read pixel_metadata"   on pixel_metadata   for select using (true);

-- Service-role (backend) can insert/update everything — uses service_role key, not anon key
-- (no policy needed for service_role — it bypasses RLS by default)

-- ────────────────────────────────────────────────────────────
-- Helper view: per-wallet portfolio summary
--
-- SECURITY INVOKER (default) means the view runs with the
-- permissions of the CALLER, not the view creator.
-- This respects RLS policies on the underlying `blocks` table
-- and avoids the "SECURITY DEFINER view" Supabase advisor warning.
-- ────────────────────────────────────────────────────────────
create or replace view wallet_portfolio
  with (security_invoker = true)
as
select
  owner_address,
  count(*)                                                           as total_blocks,
  count(*) * 100                                                     as total_pixels,
  sum(purchase_price)                                                as total_invested,
  sum(coalesce(current_price, purchase_price))                       as current_value,
  sum(coalesce(current_price, purchase_price)) - sum(purchase_price) as unrealized_pnl
from blocks
group by owner_address;
