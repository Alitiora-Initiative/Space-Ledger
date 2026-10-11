use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

declare_id!("EbP7vsnMXPonTfriPUFynco69d69JiXpWbKnwVmz8sgG");

const TREASURY: Pubkey = pubkey!("EDZjEbRAtqyC8z6ta6PYHX161Xynt13tWpd7orKERkbz");
const DEVNET_USDC_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const SOL_USD_FEED_ID: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const TOTAL_BLOCKS: u64 = 10_000_000_000;
const START_PRICE_MICRO_USD: u128 = 1_000;
const TARGET_PRICE_MICRO_USD: u128 = 1_000_000_000;
const PURCHASE_FEE_MICRO_USD: u64 = 100_000;
const MAX_PRICE_AGE_SECONDS: u64 = 90;

#[program]
pub mod space_ledger_program {
    use super::*;

    // Anyone may pay to create the singleton config. Its receiver is fixed in
    // the program, so an untrusted initializer cannot redirect test payments.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.treasury = TREASURY;
        config.current_supply = 0;
        Ok(())
    }

    pub fn purchase_sol(ctx: Context<PurchaseSol>, block_count: u32, max_lamports: u64) -> Result<()> {
        let start = ctx.accounts.config.current_supply;
        let price_micro_usd = total_price_micro_usd(start, block_count)?;
        let total_micro_usd = price_micro_usd
            .checked_add(PURCHASE_FEE_MICRO_USD)
            .ok_or(SpaceLedgerError::ArithmeticOverflow)?;

        let feed_id = get_feed_id_from_hex(SOL_USD_FEED_ID)
            .map_err(|_| error!(SpaceLedgerError::InvalidPriceFeed))?;
        let clock = Clock::get()?;
        let sol_usd = ctx.accounts.sol_usd_feed
            .get_price_no_older_than(&clock, MAX_PRICE_AGE_SECONDS, &feed_id)
            .map_err(|_| error!(SpaceLedgerError::StalePriceFeed))?;
        require!(sol_usd.price > 0, SpaceLedgerError::InvalidOraclePrice);
        require!(sol_usd.publish_time <= clock.unix_timestamp.saturating_add(30), SpaceLedgerError::InvalidOraclePrice);
        require!(sol_usd.conf <= (sol_usd.price as u64) / 10, SpaceLedgerError::OracleConfidenceTooWide);

        let lamports = usd_micro_to_lamports(total_micro_usd, sol_usd.price, sol_usd.exponent)?;
        require!(lamports <= max_lamports, SpaceLedgerError::SlippageExceeded);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            lamports,
        )?;

        settle_receipt(
            &mut ctx.accounts.config,
            &mut ctx.accounts.receipt,
            ctx.accounts.buyer.key(),
            start,
            block_count,
            Asset::Sol,
            lamports,
            price_micro_usd,
            clock.unix_timestamp,
        )
    }

    pub fn purchase_usdc(ctx: Context<PurchaseUsdc>, block_count: u32, max_usdc_units: u64) -> Result<()> {
        let start = ctx.accounts.config.current_supply;
        let price_micro_usd = total_price_micro_usd(start, block_count)?;
        let total_micro_usd = price_micro_usd
            .checked_add(PURCHASE_FEE_MICRO_USD)
            .ok_or(SpaceLedgerError::ArithmeticOverflow)?;
        require!(total_micro_usd <= max_usdc_units, SpaceLedgerError::SlippageExceeded);
        require_keys_eq!(ctx.accounts.usdc_mint.key(), DEVNET_USDC_MINT, SpaceLedgerError::WrongTokenMint);
        require_keys_eq!(ctx.accounts.config.treasury, TREASURY, SpaceLedgerError::WrongTreasury);
        require!(ctx.accounts.buyer_token_account.owner == ctx.accounts.buyer.key(), SpaceLedgerError::WrongTokenOwner);
        require!(ctx.accounts.buyer_token_account.mint == DEVNET_USDC_MINT, SpaceLedgerError::WrongTokenMint);
        require!(ctx.accounts.treasury_token_account.owner == TREASURY, SpaceLedgerError::WrongTokenOwner);
        require!(ctx.accounts.treasury_token_account.mint == DEVNET_USDC_MINT, SpaceLedgerError::WrongTokenMint);
        require!(ctx.accounts.usdc_mint.decimals == 6, SpaceLedgerError::WrongTokenDecimals);

        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            total_micro_usd,
            6,
        )?;

        settle_receipt(
            &mut ctx.accounts.config,
            &mut ctx.accounts.receipt,
            ctx.accounts.buyer.key(),
            start,
            block_count,
            Asset::Usdc,
            total_micro_usd,
            price_micro_usd,
            Clock::get()?.unix_timestamp,
        )
    }
}

fn settle_receipt(
    config: &mut Account<Config>,
    receipt: &mut Account<PurchaseReceipt>,
    buyer: Pubkey,
    start: u64,
    block_count: u32,
    asset: Asset,
    paid_units: u64,
    price_micro_usd: u64,
    settled_at: i64,
) -> Result<()> {
    require_keys_eq!(config.treasury, TREASURY, SpaceLedgerError::WrongTreasury);
    let end = start.checked_add(block_count as u64).ok_or(SpaceLedgerError::ArithmeticOverflow)?;
    require!(block_count > 0 && end <= TOTAL_BLOCKS, SpaceLedgerError::InvalidBlockCount);
    receipt.start_block = start;
    receipt.block_count = block_count;
    receipt.buyer = buyer;
    receipt.asset = asset as u8;
    receipt.paid_units = paid_units;
    receipt.price_micro_usd = price_micro_usd;
    receipt.fee_micro_usd = PURCHASE_FEE_MICRO_USD;
    receipt.settled_at = settled_at;
    config.current_supply = end;
    emit!(PurchaseSettled {
        buyer,
        start_block: start,
        block_count,
        asset: asset as u8,
        paid_units,
        price_micro_usd,
        fee_micro_usd: PURCHASE_FEE_MICRO_USD,
    });
    Ok(())
}

fn total_price_micro_usd(start: u64, block_count: u32) -> Result<u64> {
    require!(block_count > 0, SpaceLedgerError::InvalidBlockCount);
    let end = start.checked_add(block_count as u64).ok_or(SpaceLedgerError::ArithmeticOverflow)?;
    require!(end <= TOTAL_BLOCKS, SpaceLedgerError::SoldOut);

    // Sum the published linear curve in fixed-point micro-USD. The aggregate
    // division avoids per-block rounding on very large block ranges.
    let n = block_count as u128;
    let position_sum = n
        .checked_mul(start as u128).and_then(|value| value.checked_add(n * (n - 1) / 2))
        .ok_or(SpaceLedgerError::ArithmeticOverflow)?;
    let slope_delta = TARGET_PRICE_MICRO_USD - START_PRICE_MICRO_USD;
    let curve_sum = slope_delta.checked_mul(position_sum)
        .ok_or(SpaceLedgerError::ArithmeticOverflow)? / TOTAL_BLOCKS as u128;
    let total = START_PRICE_MICRO_USD.checked_mul(n)
        .and_then(|value| value.checked_add(curve_sum))
        .ok_or(SpaceLedgerError::ArithmeticOverflow)?;
    u64::try_from(total).map_err(|_| error!(SpaceLedgerError::ArithmeticOverflow))
}

fn usd_micro_to_lamports(usd_micro: u64, price: i64, exponent: i32) -> Result<u64> {
    require!((-12..=6).contains(&exponent), SpaceLedgerError::InvalidOraclePrice);
    let mut numerator = (usd_micro as u128).checked_mul(1_000)
        .ok_or(SpaceLedgerError::ArithmeticOverflow)?;
    let mut denominator = price as u128;
    if exponent < 0 {
        numerator = numerator.checked_mul(10u128.pow((-exponent) as u32))
            .ok_or(SpaceLedgerError::ArithmeticOverflow)?;
    } else {
        denominator = denominator.checked_mul(10u128.pow(exponent as u32))
            .ok_or(SpaceLedgerError::ArithmeticOverflow)?;
    }
    let rounded = numerator.checked_add(denominator - 1)
        .ok_or(SpaceLedgerError::ArithmeticOverflow)? / denominator;
    u64::try_from(rounded).map_err(|_| error!(SpaceLedgerError::ArithmeticOverflow))
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init, payer = payer, space = Config::SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseSol<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    /// CHECK: The address is constrained to the immutable treasury constant.
    #[account(mut, address = TREASURY)]
    pub treasury: UncheckedAccount<'info>,
    pub sol_usd_feed: Account<'info, PriceUpdateV2>,
    #[account(init, payer = buyer, space = PurchaseReceipt::SPACE, seeds = [b"receipt".as_ref(), config.current_supply.to_le_bytes().as_ref()], bump)]
    pub receipt: Account<'info, PurchaseReceipt>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseUsdc<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(init, payer = buyer, space = PurchaseReceipt::SPACE, seeds = [b"receipt".as_ref(), config.current_supply.to_le_bytes().as_ref()], bump)]
    pub receipt: Account<'info, PurchaseReceipt>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Config {
    pub treasury: Pubkey,
    pub current_supply: u64,
}
impl Config { pub const SPACE: usize = 8 + 32 + 8; }

#[account]
pub struct PurchaseReceipt {
    pub start_block: u64,
    pub block_count: u32,
    pub buyer: Pubkey,
    pub asset: u8,
    pub paid_units: u64,
    pub price_micro_usd: u64,
    pub fee_micro_usd: u64,
    pub settled_at: i64,
}
impl PurchaseReceipt { pub const SPACE: usize = 8 + 8 + 4 + 32 + 1 + 8 + 8 + 8 + 8; }

#[derive(Clone, Copy)]
#[repr(u8)]
pub enum Asset { Sol = 0, Usdc = 1 }

#[event]
pub struct PurchaseSettled {
    pub buyer: Pubkey,
    pub start_block: u64,
    pub block_count: u32,
    pub asset: u8,
    pub paid_units: u64,
    pub price_micro_usd: u64,
    pub fee_micro_usd: u64,
}

#[error_code]
pub enum SpaceLedgerError {
    #[msg("The block count is invalid.")] InvalidBlockCount,
    #[msg("All blocks have been sold.")] SoldOut,
    #[msg("The required payment exceeds the buyer's maximum.")] SlippageExceeded,
    #[msg("The supplied oracle price is invalid.")] InvalidOraclePrice,
    #[msg("The oracle confidence interval is too wide.")] OracleConfidenceTooWide,
    #[msg("The SOL/USD oracle feed is invalid.")] InvalidPriceFeed,
    #[msg("The SOL/USD price is too old.")] StalePriceFeed,
    #[msg("The supplied treasury is not the configured receiver.")] WrongTreasury,
    #[msg("The token mint is not the Devnet USDC mint.")] WrongTokenMint,
    #[msg("The token account owner is incorrect.")] WrongTokenOwner,
    #[msg("The token mint must use six decimals.")] WrongTokenDecimals,
    #[msg("Arithmetic overflow.")] ArithmeticOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curve_and_fixed_point_sol_conversion() {
        assert_eq!(total_price_micro_usd(0, 1).unwrap(), 1_000);
        assert!(total_price_micro_usd(0, 100).unwrap() > 100_000);
        assert!(total_price_micro_usd(TOTAL_BLOCKS - 1, 1).unwrap() <= 1_000_000_000);
        assert!(total_price_micro_usd(TOTAL_BLOCKS, 1).is_err());
        // $1 at $100/SOL is 0.01 SOL.
        assert_eq!(usd_micro_to_lamports(1_000_000, 10_000_000_000, -8).unwrap(), 10_000_000);
    }
}
