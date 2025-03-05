use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

declare_id!("Gnm44jNsMtxvkEvpxqZ7FCGdNaTeMKVhv1VaiyX1nVPQ");

#[program]
pub mod liquidity_pool {
    use super::*;

    pub fn deposit_funds(
        ctx: Context<DepositFunds>,
        amount: u64,
        exchange_rate: u64,
        nonce: u64,
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        let taker = &ctx.accounts.taker;

        transaction.taker = taker.key();
        transaction.amount = amount;
        transaction.exchange_rate = exchange_rate;
        transaction.status = TransactionStatus::Pending;
        transaction.nonce = nonce;
        transaction.bump = ctx.bumps.transaction;

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.taker_token_account.to_account_info(),
            to: ctx.accounts.program_token_account.to_account_info(),
            authority: ctx.accounts.taker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn accept_offer(ctx: Context<AcceptOffer>) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;

        require!(
            transaction.status == TransactionStatus::Pending,
            ErrorCode::OfferNotPending
        );

        transaction.status = TransactionStatus::Accepted;

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.program_token_account.to_account_info(),
            to: ctx.accounts.maker_token_account.to_account_info(),
            authority: ctx.accounts.program_token_pda.to_account_info(), // Use program_token_pda
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[b"program_token_account" as &[u8], &[ctx.bumps.program_token_pda]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        anchor_spl::token::transfer(cpi_ctx, transaction.amount)?;

        Ok(())
    }

    pub fn cancel_offer(ctx: Context<CancelOffer>) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;

        require!(
            transaction.status == TransactionStatus::Pending,
            ErrorCode::OfferNotPending
        );

        transaction.status = TransactionStatus::Canceled;

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.program_token_account.to_account_info(),
            to: ctx.accounts.taker_token_account.to_account_info(),
            authority: ctx.accounts.program_token_pda.to_account_info(), // Use program_token_pda
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[b"program_token_account" as &[u8], &[ctx.bumps.program_token_pda]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        anchor_spl::token::transfer(cpi_ctx, transaction.amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount: u64, exchange_rate: u64, nonce: u64)]
pub struct DepositFunds<'info> {
    #[account(
        init,
        payer = taker,
        space = 8 + std::mem::size_of::<Transaction>(),
        seeds = [b"transaction", taker.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub transaction: Account<'info, Transaction>,
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(mut)]
    pub taker_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(mut)]
    pub program_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptOffer<'info> {
    #[account(
        mut,
        has_one = taker,
        seeds = [b"transaction", taker.key().as_ref(), &transaction.nonce.to_le_bytes()],
        bump = transaction.bump
    )]
    pub transaction: Account<'info, Transaction>,
    /// CHECK: This is not a signer or writable account; it’s just a reference to the taker’s public key, validated by the transaction account’s has_one constraint.
    pub taker: AccountInfo<'info>,
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(mut)]
    pub maker_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(mut)]
    pub program_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(
        seeds = [b"program_token_account"],
        bump
    )]
    /// CHECK: This is a PDA derived from "program_token_account" seeds and bump, used as the authority for token transfers; its validity is ensured by the seeds and bump constraints.
    pub program_token_pda: AccountInfo<'info>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

#[derive(Accounts)]
pub struct CancelOffer<'info> {
    #[account(
        mut,
        has_one = taker,
        seeds = [b"transaction", taker.key().as_ref(), &transaction.nonce.to_le_bytes()],
        bump = transaction.bump
    )]
    pub transaction: Account<'info, Transaction>,
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(mut)]
    pub taker_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(mut)]
    pub program_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    #[account(
        seeds = [b"program_token_account"],
        bump
    )]
    /// CHECK: This is a PDA derived from "program_token_account" seeds and bump, used as the authority for token transfers; its validity is ensured by the seeds and bump constraints.
    pub program_token_pda: AccountInfo<'info>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

#[account]
pub struct Transaction {
    pub taker: Pubkey,
    pub amount: u64,
    pub exchange_rate: u64,
    pub status: TransactionStatus,
    pub nonce: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TransactionStatus {
    Pending,
    Accepted,
    Canceled,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Offer is not pending")]
    OfferNotPending,
}