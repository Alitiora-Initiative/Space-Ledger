/**
 * Space Ledger — Price Engine (C)
 * =================================
 * Lightweight C version for environments where C++ is not available.
 * Identical math, no dependencies.
 *
 * Compile:  gcc -O3 -o price_engine_c native/price_engine.c -lm
 * Run:      ./price_engine_c
 */

#include <stdio.h>
#include <stdint.h>
#include <math.h>
#include <string.h>
#include <stdlib.h>

#define TOTAL_BLOCKS     10000000000ULL
#define STARTING_PRICE   0.001
#define TARGET_PRICE     10.0
#define SLOPE            ((TARGET_PRICE - STARTING_PRICE) / (double)TOTAL_BLOCKS)
#define PLATFORM_FEE     0.10

static double block_price(uint64_t block_id) {
    if (block_id >= TOTAL_BLOCKS) block_id = TOTAL_BLOCKS - 1;
    return SLOPE * (double)block_id + STARTING_PRICE;
}

static double total_price_range(uint64_t start, uint64_t count) {
    double first = block_price(start);
    double last  = block_price(start + count - 1);
    return (double)count / 2.0 * (first + last);
}

int main(int argc, char *argv[]) {
    (void)argc; (void)argv;

    printf("=== C Price Engine Self-Test ===\n");
    printf("Block          0: $%.6f\n", block_price(0));
    printf("Block    1,000M: $%.6f\n", block_price(1000000000ULL));
    printf("Block    5,000M: $%.6f\n", block_price(5000000000ULL));
    printf("Block 9,999.99M: $%.6f\n", block_price(9999999999ULL));
    printf("\n");
    printf("100 blocks from 0:  $%.6f\n", total_price_range(0, 100));
    printf("1  block  at 5B:    $%.6f\n", total_price_range(5000000000ULL, 1));
    return 0;
}
