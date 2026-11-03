-- Separate Devnet receipt history tables. Existing demo tables are not modified.
create table if not exists public.purchase_receipts (
 network text not null check(network='devnet'),receipt_address text not null,program_id text not null,buyer text not null,
 start_block numeric(20,0) not null,block_count integer not null check(block_count>0),end_block numeric(20,0) not null,
 asset text not null check(asset in('SOL','USDC')),paid_units numeric(40,0) not null,price_micro_usd numeric(40,0) not null,
 fee_micro_usd numeric(40,0) not null,settled_at timestamptz not null,slot bigint,signature text,
 commitment text not null default 'confirmed' check(commitment in('confirmed','finalized')),
 raw_receipt jsonb not null default '{}'::jsonb,indexed_at timestamptz not null default now(),
 primary key(network,receipt_address),unique(network,program_id,start_block)
);
create index if not exists purchase_receipts_buyer_settled_idx on public.purchase_receipts(network,buyer,settled_at desc);
create index if not exists purchase_receipts_slot_idx on public.purchase_receipts(network,slot desc);
create table if not exists public.chain_events (
 network text not null check(network='devnet'),signature text not null,event_index integer not null check(event_index>=0),
 program_id text not null,slot bigint not null,block_time timestamptz,event_type text not null,payload jsonb not null,
 commitment text not null default 'confirmed' check(commitment in('confirmed','finalized')),indexed_at timestamptz not null default now(),
 primary key(network,signature,event_index)
);
create index if not exists chain_events_slot_idx on public.chain_events(network,slot desc);
create index if not exists chain_events_type_idx on public.chain_events(network,event_type,slot desc);
create table if not exists public.indexer_state (
 network text not null check(network='devnet'),program_id text not null,last_indexed_slot bigint not null default 0,
 last_signature text,last_success_at timestamptz,last_error text,receipts_indexed bigint not null default 0,
 updated_at timestamptz not null default now(),primary key(network,program_id)
);
alter table public.purchase_receipts enable row level security;
alter table public.chain_events enable row level security;
alter table public.indexer_state enable row level security;
revoke all on public.purchase_receipts,public.chain_events,public.indexer_state from anon,authenticated;
grant select,insert,update,delete on public.purchase_receipts,public.chain_events,public.indexer_state to service_role;