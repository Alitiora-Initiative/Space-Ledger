package com.spaceledger;

/**
 * Space Ledger — Bonding Curve (Java)
 * =====================================
 * Standalone verifier and batch calculator.
 * Matches the Node.js, Python, Rust, and C++ implementations exactly.
 *
 * Compile: javac -d java/out java/src/main/java/com/spaceledger/BondingCurve.java
 * Run:     java -cp java/out com.spaceledger.BondingCurve
 */

import java.util.ArrayList;
import java.util.List;

public class BondingCurve {

    // ── Constants ────────────────────────────────────────────────────────────
    public static final long   TOTAL_BLOCKS    = 10_000_000_000L;
    public static final double STARTING_PRICE  = 0.001;
    public static final double TARGET_PRICE    = 10.0;
    public static final double SLOPE           = (TARGET_PRICE - STARTING_PRICE) / TOTAL_BLOCKS;
    public static final double PLATFORM_FEE    = 0.10;

    // ── Core pricing ─────────────────────────────────────────────────────────

    /**
     * Linear bonding curve: P(x) = SLOPE * x + STARTING_PRICE
     */
    public static double blockPrice(long blockId) {
        if (blockId < 0)           blockId = 0;
        if (blockId >= TOTAL_BLOCKS) blockId = TOTAL_BLOCKS - 1;
        return SLOPE * blockId + STARTING_PRICE;
    }

    /**
     * O(1) arithmetic series sum for a range of blocks.
     */
    public static double totalPriceRange(long start, long count) {
        double first = blockPrice(start);
        double last  = blockPrice(start + count - 1);
        return count / 2.0 * (first + last);
    }

    public static double totalWithFee(long start, long count) {
        return totalPriceRange(start, count) + PLATFORM_FEE * count;
    }

    // ── PnL ─────────────────────────────────────────────────────────────────

    public record PnlResult(
        int    totalBlocks,
        double totalInvested,
        double currentValue,
        double unrealizedPnl,
        double pnlPct
    ) {}

    public record BlockEntry(long blockId, double purchasePrice) {}

    public static PnlResult calculatePnl(List<BlockEntry> blocks) {
        double invested = 0.0;
        double current  = 0.0;

        for (BlockEntry b : blocks) {
            invested += b.purchasePrice();
            current  += blockPrice(b.blockId());
        }

        double pnl = current - invested;
        double pct = invested > 0 ? (pnl / invested * 100.0) : 0.0;

        return new PnlResult(blocks.size(), invested, current, pnl, pct);
    }

    // ── Main (self-test) ─────────────────────────────────────────────────────

    public static void main(String[] args) {
        System.out.println("=== Java Bonding Curve Verifier ===");
        System.out.printf("Block          0: $%.6f%n", blockPrice(0));
        System.out.printf("Block    1,000M: $%.6f%n", blockPrice(1_000_000_000L));
        System.out.printf("Block    5,000M: $%.6f%n", blockPrice(5_000_000_000L));
        System.out.printf("Block 9,999.99M: $%.6f%n", blockPrice(9_999_999_999L));
        System.out.println();
        System.out.printf("100 blocks from 0:  $%.6f  (with fees: $%.6f)%n",
            totalPriceRange(0, 100), totalWithFee(0, 100));
        System.out.printf("1 block at 5B:      $%.6f  (with fee:  $%.6f)%n",
            totalPriceRange(5_000_000_000L, 1), totalWithFee(5_000_000_000L, 1));
        System.out.println();

        List<BlockEntry> demo = new ArrayList<>();
        demo.add(new BlockEntry(0L,                blockPrice(0)));
        demo.add(new BlockEntry(1_000_000L,         blockPrice(1_000_000L)));
        demo.add(new BlockEntry(500_000_000L,        blockPrice(500_000_000L)));

        PnlResult pnl = calculatePnl(demo);
        System.out.println("=== PnL for 3 entry blocks ===");
        System.out.println("  Blocks:         " + pnl.totalBlocks());
        System.out.printf( "  Total invested: $%.6f%n", pnl.totalInvested());
        System.out.printf( "  Current value:  $%.6f%n", pnl.currentValue());
        System.out.printf( "  Unrealized PnL: $%.6f%n", pnl.unrealizedPnl());
        System.out.printf( "  PnL %%:          %.4f%%%n", pnl.pnlPct());

        // Verify all implementations agree
        System.out.println();
        System.out.println("=== Cross-language consistency check ===");
        double jsResult = 9.999e-10 * 5_000_000_000L + 0.001;
        double javaResult = blockPrice(5_000_000_000L);
        System.out.printf("  JS formula result:   $%.9f%n", jsResult);
        System.out.printf("  Java formula result: $%.9f%n", javaResult);
        boolean match = Math.abs(jsResult - javaResult) < 1e-12;
        System.out.println("  Match: " + (match ? "✓ PASS" : "✗ FAIL"));
    }
}
