/// Space Ledger — Bonding Curve Validator (Rust)
/// ================================================
/// High-speed batch validation of bonding curve prices.
/// Used to cross-check the Node.js and Python implementations.
///
/// Build:  cargo build --release
/// Run:    cargo run --release
/// Or pipe JSON:
///   echo '{"blocks":[{"blockId":0},{"blockId":1000000000}]}' | cargo run --release -- --batch

use std::io::{self, Read};

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_BLOCKS: u64    = 10_000_000_000;
const STARTING_PRICE: f64  = 0.001;
const TARGET_PRICE: f64    = 10.0;
const SLOPE: f64           = (TARGET_PRICE - STARTING_PRICE) / TOTAL_BLOCKS as f64;
const PLATFORM_FEE: f64    = 0.10;

// ── Core pricing ──────────────────────────────────────────────────────────────

fn block_price(block_id: u64) -> f64 {
    let clamped = block_id.min(TOTAL_BLOCKS - 1);
    SLOPE * clamped as f64 + STARTING_PRICE
}

fn total_price_for_range(start: u64, count: u64) -> f64 {
    // Sum of arithmetic series: n/2 * (first + last)
    // first = SLOPE*start + START,  last = SLOPE*(start+count-1) + START
    let first = block_price(start);
    let last  = block_price(start + count - 1);
    count as f64 / 2.0 * (first + last)
}

fn total_with_fee(start: u64, count: u64) -> f64 {
    total_price_for_range(start, count) + PLATFORM_FEE * count as f64
}

// ── PnL ───────────────────────────────────────────────────────────────────────

#[derive(Debug)]
struct PnlResult {
    total_blocks:   usize,
    total_invested: f64,
    current_value:  f64,
    unrealized_pnl: f64,
    pnl_pct:        f64,
}

fn calculate_pnl(entries: &[(u64, f64)]) -> PnlResult {
    // entries: (block_id, purchase_price)
    let total_invested: f64 = entries.iter().map(|(_, p)| p).sum();
    let current_value:  f64 = entries.iter().map(|(id, _)| block_price(*id)).sum();
    let unrealized_pnl       = current_value - total_invested;
    let pnl_pct              = if total_invested > 0.0 {
        unrealized_pnl / total_invested * 100.0
    } else {
        0.0
    };

    PnlResult {
        total_blocks:   entries.len(),
        total_invested,
        current_value,
        unrealized_pnl,
        pnl_pct,
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let batch_mode = args.iter().any(|a| a == "--batch");

    if batch_mode {
        // Read JSON from stdin: {"blocks":[{"blockId":0,"purchasePrice":0.001},...]}
        let mut input = String::new();
        io::stdin().read_to_string(&mut input).expect("Failed to read stdin");

        // Simple JSON parse without serde (keeping deps minimal)
        let entries = parse_blocks_json(&input);
        let result  = calculate_pnl(&entries);

        println!(
            "{{\"totalBlocks\":{},\"totalInvested\":{:.6},\"currentValue\":{:.6},\
             \"unrealizedPnl\":{:.6},\"pnlPct\":{:.4}}}",
            result.total_blocks, result.total_invested,
            result.current_value, result.unrealized_pnl, result.pnl_pct
        );
    } else {
        // Self-test
        println!("=== Rust Bonding Curve Validator ===");
        println!("Block          0: ${:.6}",  block_price(0));
        println!("Block    1,000M: ${:.6}",  block_price(1_000_000_000));
        println!("Block    5,000M: ${:.6}",  block_price(5_000_000_000));
        println!("Block 9,999.99M: ${:.6}",  block_price(9_999_999_999));
        println!();
        println!("Buy 100 blocks from 0:     ${:.6} (+ fees: ${:.6})",
            total_price_for_range(0, 100),
            total_with_fee(0, 100)
        );
        println!("Buy 1 block at 5B:         ${:.6} (+ fee: ${:.6})",
            total_price_for_range(5_000_000_000, 1),
            total_with_fee(5_000_000_000, 1)
        );
        println!();

        // PnL demo
        let entries = vec![
            (0u64,           block_price(0)),
            (1_000_000u64,   block_price(1_000_000)),
            (500_000_000u64, block_price(500_000_000)),
        ];
        let pnl = calculate_pnl(&entries);
        println!("=== PnL for 3 entry blocks ===");
        println!("  Blocks:          {}", pnl.total_blocks);
        println!("  Total invested:  ${:.6}", pnl.total_invested);
        println!("  Current value:   ${:.6}", pnl.current_value);
        println!("  Unrealized PnL:  ${:.6}", pnl.unrealized_pnl);
        println!("  PnL %:           {:.4}%", pnl.pnl_pct);
    }
}

// Minimal JSON block array parser (no external crates needed)
fn parse_blocks_json(input: &str) -> Vec<(u64, f64)> {
    let mut result = Vec::new();
    // Find "blockId": <n> and optionally "purchasePrice": <f>
    let id_pattern  = "\"blockId\":";
    let pp_pattern  = "\"purchasePrice\":";

    let chars: Vec<char> = input.chars().collect();
    let s = input;

    let mut pos = 0;
    while let Some(idx) = s[pos..].find(id_pattern) {
        let start = pos + idx + id_pattern.len();
        // skip whitespace
        let trimmed = s[start..].trim_start();
        let num_end = trimmed.find(|c: char| !c.is_ascii_digit()).unwrap_or(trimmed.len());
        let block_id: u64 = trimmed[..num_end].parse().unwrap_or(0);

        // Look for purchasePrice nearby (within next 200 chars)
        let search_window = &s[start..std::cmp::min(start + 200, s.len())];
        let purchase_price = if let Some(pp_idx) = search_window.find(pp_pattern) {
            let pp_start = pp_idx + pp_pattern.len();
            let pp_trimmed = search_window[pp_start..].trim_start();
            let pp_end = pp_trimmed
                .find(|c: char| c == ',' || c == '}')
                .unwrap_or(pp_trimmed.len());
            pp_trimmed[..pp_end].trim().parse::<f64>().unwrap_or(block_price(block_id))
        } else {
            block_price(block_id)
        };

        result.push((block_id, purchase_price));
        pos = start + 1;
        let _ = chars.len(); // suppress unused warning
    }
    result
}
