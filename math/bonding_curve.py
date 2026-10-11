"""
Space Ledger — Bonding Curve Mathematics (Python)
==================================================
All price and PnL calculations live here.
Run standalone:  python math/bonding_curve.py
Expose as an HTTP microservice:  python math/bonding_curve.py --serve
The Node.js server calls it via  GET http://localhost:5001/price?id=<blockId>
"""

import math
import json
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

# ── Constants ─────────────────────────────────────────────────────────────────
TOTAL_BLOCKS    = 10_000_000_000          # 10 billion blocks
PIXELS_PER_BLOCK = 100
TOTAL_PIXELS    = TOTAL_BLOCKS * PIXELS_PER_BLOCK   # 1 trillion
STARTING_PRICE  = 0.001                   # USD at block 0
TARGET_PRICE    = 10.00                   # USD at block 9,999,999,999
SLOPE           = (TARGET_PRICE - STARTING_PRICE) / TOTAL_BLOCKS   # ~9.999e-10
PLATFORM_FEE    = 0.10                    # flat USD fee per transaction

# ── Core pricing ──────────────────────────────────────────────────────────────

def block_price(block_id: int) -> float:
    """
    Linear bonding curve:  P(x) = SLOPE * x + STARTING_PRICE
    Returns USD price for a given block ID.
    """
    block_id = max(0, min(block_id, TOTAL_BLOCKS - 1))
    return SLOPE * block_id + STARTING_PRICE


def pixel_price(global_pixel_id: int) -> float:
    """Price per individual pixel = block_price / PIXELS_PER_BLOCK."""
    block_id = global_pixel_id // PIXELS_PER_BLOCK
    return block_price(block_id) / PIXELS_PER_BLOCK


def range_prices(start: int, count: int) -> list[dict]:
    """Returns a list of {blockId, price} for count consecutive blocks from start."""
    count = min(count, 1000)
    return [
        {"blockId": start + i, "price": round(block_price(start + i), 9)}
        for i in range(count)
    ]


# ── PnL calculations ──────────────────────────────────────────────────────────

def calculate_pnl(blocks: list[dict]) -> dict:
    """
    Accepts a list of {blockId, purchasePrice} dicts.
    Returns PnL summary matching what the frontend profile page displays.

    Args:
        blocks: list of dicts with keys 'blockId' and 'purchasePrice'

    Returns:
        dict with totalInvested, currentValue, unrealizedPnl, pnlPercent,
        totalBlocks, totalPixels
    """
    total_invested = 0.0
    current_value  = 0.0

    for b in blocks:
        bid            = int(b["blockId"])
        buy_price      = float(b["purchasePrice"])
        now_price      = block_price(bid)
        total_invested += buy_price
        current_value  += now_price

    unrealized_pnl = current_value - total_invested
    pnl_percent    = (unrealized_pnl / total_invested * 100) if total_invested > 0 else 0.0

    return {
        "totalBlocks":    len(blocks),
        "totalPixels":    len(blocks) * PIXELS_PER_BLOCK,
        "totalInvested":  round(total_invested, 6),
        "currentValue":   round(current_value,  6),
        "unrealizedPnl":  round(unrealized_pnl, 6),
        "pnlPercent":     round(pnl_percent,    4),
    }


def treasury_vesting_progress(months_since_launch: float) -> dict:
    """
    Calculates how much of the 1-billion treasury block allocation has vested.

    Cliff:   12 months (nothing releases before this)
    Vesting: linear over 36 months after cliff

    Returns: {phase, vestingPct, releasableBlocks, totalAllocation}
    """
    CLIFF_MONTHS   = 12
    VEST_MONTHS    = 36
    TOTAL_ALLOC    = 1_000_000_000

    if months_since_launch < CLIFF_MONTHS:
        return {
            "phase":            "cliff",
            "monthsRemaining":  round(CLIFF_MONTHS - months_since_launch, 2),
            "vestingPct":       0.0,
            "releasableBlocks": 0,
            "totalAllocation":  TOTAL_ALLOC,
        }

    months_after_cliff = months_since_launch - CLIFF_MONTHS
    pct = min(months_after_cliff / VEST_MONTHS, 1.0)
    releasable = math.floor(TOTAL_ALLOC * pct)

    return {
        "phase":            "vesting",
        "monthsAfterCliff": round(months_after_cliff, 2),
        "vestingPct":       round(pct * 100, 4),
        "releasableBlocks": releasable,
        "totalAllocation":  TOTAL_ALLOC,
    }


def bonding_curve_info() -> dict:
    """Returns all curve constants — useful for the frontend to verify alignment."""
    return {
        "totalBlocks":   TOTAL_BLOCKS,
        "totalPixels":   TOTAL_PIXELS,
        "startingPrice": STARTING_PRICE,
        "targetPrice":   TARGET_PRICE,
        "slope":         SLOPE,
        "platformFee":   PLATFORM_FEE,
        "formula":       f"P(x) = {SLOPE:.4e}·x + {STARTING_PRICE}",
    }


# ── HTTP microservice ─────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    """Tiny HTTP handler so Node.js can delegate math to Python."""

    def log_message(self, fmt, *args):
        pass  # silence default access log

    def send_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        qs     = parse_qs(parsed.query)

        if parsed.path == "/price":
            bid = int(qs.get("id", [0])[0])
            self.send_json({"blockId": bid, "price": block_price(bid)})

        elif parsed.path == "/price/range":
            start = int(qs.get("start", [0])[0])
            count = int(qs.get("count", [10])[0])
            self.send_json(range_prices(start, count))

        elif parsed.path == "/info":
            self.send_json(bonding_curve_info())

        elif parsed.path == "/vesting":
            months = float(qs.get("months", [0])[0])
            self.send_json(treasury_vesting_progress(months))

        else:
            self.send_json({"error": "unknown route"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        body   = json.loads(self.rfile.read(length)) if length else {}

        if parsed.path == "/pnl":
            blocks = body.get("blocks", [])
            self.send_json(calculate_pnl(blocks))
        else:
            self.send_json({"error": "unknown route"}, 404)


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Space Ledger bonding curve math service")
    parser.add_argument("--serve", action="store_true", help="Start HTTP server on port 5001")
    parser.add_argument("--port",  type=int, default=5001)
    args = parser.parse_args()

    if args.serve:
        server = HTTPServer(("127.0.0.1", args.port), Handler)
        print(f"Python math service running on http://127.0.0.1:{args.port}")
        print("  GET  /price?id=<blockId>")
        print("  GET  /price/range?start=<n>&count=<n>")
        print("  GET  /vesting?months=<n>")
        print("  GET  /info")
        print("  POST /pnl  body: {blocks:[{blockId,purchasePrice}]}")
        server.serve_forever()
    else:
        # Quick self-test
        print("=== Bonding Curve Self-Test ===")
        print(f"Block 0 price:          ${block_price(0):.6f}")
        print(f"Block 1B price:         ${block_price(1_000_000_000):.6f}")
        print(f"Block 5B price:         ${block_price(5_000_000_000):.6f}")
        print(f"Block 9.999B price:     ${block_price(9_999_999_999):.6f}")
        print()

        # PnL test
        test_blocks = [
            {"blockId": 0,         "purchasePrice": block_price(0)},
            {"blockId": 1_000_000, "purchasePrice": block_price(1_000_000)},
        ]
        pnl = calculate_pnl(test_blocks)
        print("=== PnL Test (entry at block 0 and 1M) ===")
        for k, v in pnl.items():
            print(f"  {k}: {v}")
        print()

        # Vesting test
        vest_12 = treasury_vesting_progress(12)
        vest_24 = treasury_vesting_progress(24)
        print("=== Vesting at 12 months (cliff end) ===")
        print(json.dumps(vest_12, indent=2))
        print("=== Vesting at 24 months (12 after cliff) ===")
        print(json.dumps(vest_24, indent=2))
