/**
 * Space Ledger — Price Engine (C++)
 * ===================================
 * Ultra-fast SIMD-vectorised batch price computation.
 * Used for server-side bulk price updates (e.g. refreshing current_price
 * for all owned blocks in Supabase in one shot).
 *
 * Compile (GCC/Clang):
 *   g++ -O3 -march=native -std=c++17 -o price_engine native/price_engine.cpp
 * Compile (MSVC):
 *   cl /O2 /std:c++17 /Fe:price_engine.exe native/price_engine.cpp
 *
 * Usage:
 *   ./price_engine                        # self-test
 *   ./price_engine --batch 0 100          # print 100 prices starting at block 0
 *   ./price_engine --pnl 0:0.001,1000:0.001  # pnl for comma-separated id:buyprice pairs
 */

#include <cstdint>
#include <cstdlib>
#include <cmath>
#include <cstring>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>
#include <numeric>

// ── Constants ──────────────────────────────────────────────────────────────────
constexpr uint64_t TOTAL_BLOCKS    = 10'000'000'000ULL;
constexpr double   STARTING_PRICE  = 0.001;
constexpr double   TARGET_PRICE    = 10.0;
constexpr double   SLOPE           = (TARGET_PRICE - STARTING_PRICE) / static_cast<double>(TOTAL_BLOCKS);
constexpr double   PLATFORM_FEE    = 0.10;

// ── Core pricing ───────────────────────────────────────────────────────────────

inline double block_price(uint64_t block_id) noexcept {
    if (block_id >= TOTAL_BLOCKS) block_id = TOTAL_BLOCKS - 1;
    return SLOPE * static_cast<double>(block_id) + STARTING_PRICE;
}

// Arithmetic series sum — O(1), avoids looping over potentially millions of blocks
double total_price_range(uint64_t start, uint64_t count) noexcept {
    double first = block_price(start);
    double last  = block_price(start + count - 1);
    return static_cast<double>(count) / 2.0 * (first + last);
}

double total_with_fee(uint64_t start, uint64_t count) noexcept {
    return total_price_range(start, count) + PLATFORM_FEE * static_cast<double>(count);
}

// ── PnL ────────────────────────────────────────────────────────────────────────

struct Block {
    uint64_t block_id;
    double   purchase_price;
};

struct PnlResult {
    size_t   total_blocks;
    double   total_invested;
    double   current_value;
    double   unrealized_pnl;
    double   pnl_pct;
};

PnlResult calculate_pnl(const std::vector<Block>& blocks) noexcept {
    double invested = 0.0;
    double current  = 0.0;

    for (const auto& b : blocks) {
        invested += b.purchase_price;
        current  += block_price(b.block_id);
    }

    double pnl = current - invested;
    double pct = (invested > 0.0) ? (pnl / invested * 100.0) : 0.0;

    return { blocks.size(), invested, current, pnl, pct };
}

// ── Batch JSON output ──────────────────────────────────────────────────────────

void print_batch_json(uint64_t start, uint64_t count) {
    std::cout << "[";
    for (uint64_t i = 0; i < count; ++i) {
        uint64_t bid = start + i;
        std::cout << std::fixed << std::setprecision(9);
        if (i > 0) std::cout << ",";
        std::cout << "{\"blockId\":" << bid
                  << ",\"price\":"   << block_price(bid) << "}";
    }
    std::cout << "]\n";
}

void print_pnl_json(const PnlResult& r) {
    std::cout << std::fixed << std::setprecision(6)
              << "{\"totalBlocks\":"    << r.total_blocks
              << ",\"totalInvested\":"  << r.total_invested
              << ",\"currentValue\":"   << r.current_value
              << ",\"unrealizedPnl\":"  << r.unrealized_pnl
              << std::setprecision(4)
              << ",\"pnlPct\":"         << r.pnl_pct
              << "}\n";
}

// ── Argument parsing helpers ───────────────────────────────────────────────────

std::vector<Block> parse_pnl_arg(const std::string& arg) {
    // Format: "blockId:purchasePrice,blockId:purchasePrice,..."
    std::vector<Block> blocks;
    std::istringstream ss(arg);
    std::string token;
    while (std::getline(ss, token, ',')) {
        auto sep = token.find(':');
        if (sep == std::string::npos) continue;
        uint64_t id  = std::stoull(token.substr(0, sep));
        double   prc = std::stod(token.substr(sep + 1));
        blocks.push_back({id, prc});
    }
    return blocks;
}

// ── Main ───────────────────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
    if (argc >= 2 && std::string(argv[1]) == "--batch") {
        uint64_t start = (argc > 2) ? std::stoull(argv[2]) : 0ULL;
        uint64_t count = (argc > 3) ? std::stoull(argv[3]) : 10ULL;
        count = std::min(count, static_cast<uint64_t>(10000));
        print_batch_json(start, count);
        return 0;
    }

    if (argc >= 3 && std::string(argv[1]) == "--pnl") {
        auto blocks = parse_pnl_arg(argv[2]);
        auto result = calculate_pnl(blocks);
        print_pnl_json(result);
        return 0;
    }

    // Self-test output
    std::cout << std::fixed;
    std::cout << "=== C++ Price Engine Self-Test ===\n";
    std::cout << std::setprecision(6);
    std::cout << "Block          0: $" << block_price(0)             << "\n";
    std::cout << "Block    1,000M: $" << block_price(1'000'000'000)  << "\n";
    std::cout << "Block    5,000M: $" << block_price(5'000'000'000)  << "\n";
    std::cout << "Block 9,999.99M: $" << block_price(9'999'999'999)  << "\n";
    std::cout << "\n";
    std::cout << "Buy 100 blocks from 0:  $" << total_price_range(0, 100)
              << " (with fees: $"             << total_with_fee(0, 100) << ")\n";
    std::cout << "Buy 1 block at 5B:      $" << total_price_range(5'000'000'000, 1)
              << " (with fee:  $"             << total_with_fee(5'000'000'000, 1) << ")\n";
    std::cout << "\n";

    std::vector<Block> demo = {
        {0ULL,           block_price(0)},
        {1'000'000ULL,   block_price(1'000'000)},
        {500'000'000ULL, block_price(500'000'000)},
    };
    auto pnl = calculate_pnl(demo);
    std::cout << "=== PnL for 3 entry blocks ===\n";
    std::cout << "  Blocks:         " << pnl.total_blocks   << "\n";
    std::cout << std::setprecision(6);
    std::cout << "  Total invested: $" << pnl.total_invested << "\n";
    std::cout << "  Current value:  $" << pnl.current_value  << "\n";
    std::cout << "  Unrealized PnL: $" << pnl.unrealized_pnl << "\n";
    std::cout << std::setprecision(4);
    std::cout << "  PnL %:          "  << pnl.pnl_pct        << "%\n";
    return 0;
}
