use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

declare_id!("4B6SCjBKMUvBzv5epJK7GeVfHGwGZb5EdEVxGbZakb7u");

#[program]
pub mod liquidity_pool {
    use super::*;

    // create a new pool
    pub fn create_pool(
        ctx: Context<CreatePool>,
        currency: [u8; 3], // Fixed-size array for currency
        initial_liquidity: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.currency = currency;
        pool.total_liquidity = initial_liquidity;
        pool.status = PoolStatus::Active;
        pool.bump = ctx.bumps.pool; // Access the bump directly
        Ok(())
    }

      
       pub fn create_maker(ctx: Context<CreateMaker>) -> Result<()> {
        let maker = &mut ctx.accounts.maker;
        maker.authority = ctx.accounts.authority.key();
        maker.verified_status = MakerStatus::Pending; 
        maker.bump = ctx.bumps.maker; 
        Ok(())
    }

     
       pub fn create_contribution(ctx: Context<CreateContribution>) -> Result<()> {
        let contribution = &mut ctx.accounts.contribution;
        contribution.pool = ctx.accounts.pool.key();
        contribution.maker = ctx.accounts.maker.key();
        contribution.amount = 0; 
        contribution.bump = ctx.bumps.contribution;
        Ok(())
    }

   
    pub fn create_transaction(ctx: Context<CreateTransaction>) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        transaction.pool = ctx.accounts.pool.key();
        transaction.maker = ctx.accounts.maker.key();
        transaction.transaction_type = TransactionType::Deposit; 
        transaction.amount = 0; 
        transaction.status = TransactionStatus::Pending; 
        transaction.bump = ctx.bumps.transaction;
        Ok(())
    }

    pub fn verify_maker(ctx: Context<VerifyMaker>) -> Result<()> {
        let maker = &mut ctx.accounts.maker;
        maker.verified_status = MakerStatus::Verified;
        Ok(())
    }

//deposit funds into a pool
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let maker = &mut ctx.accounts.maker;
        let contribution = &mut ctx.accounts.contribution;
    
        require!(maker.verified_status == MakerStatus::Verified, ErrorCode::MakerNotVerified);
    
        pool.total_liquidity += amount;
        contribution.amount += amount;
    
        let transaction = &mut ctx.accounts.transaction;
        transaction.transaction_type = TransactionType::Deposit;
        transaction.amount = amount;
        transaction.status = TransactionStatus::Completed;
        transaction.bump = ctx.bumps.transaction;
    
        Ok(())
    }
  // withdraw funds from a pool
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let maker = &mut ctx.accounts.maker;
        let contribution = &mut ctx.accounts.contribution;

        // Verify maker status
        require!(maker.verified_status == MakerStatus::Verified, ErrorCode::MakerNotVerified);

      
        require!(contribution.amount >= amount, ErrorCode::InsufficientFunds);

       
        pool.total_liquidity -= amount;

       
        contribution.amount -= amount;

        // Record transaction
        let transaction = &mut ctx.accounts.transaction;
        transaction.transaction_type = TransactionType::Withdrawal;
        transaction.amount = amount;
        transaction.status = TransactionStatus::Completed;
        transaction.bump = ctx.bumps.transaction; 

        Ok(())
    }
}



#[derive(Accounts)]
pub struct CreateMaker<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Maker>(),
        seeds = [b"maker", authority.key().as_ref()],
        bump
    )]
    pub maker: Account<'info, Maker>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}




#[derive(Accounts)]
#[instruction(currency: [u8; 3])] // Pass the currency argument
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Pool>(),
        seeds = [b"pool", currency.as_ref()], // Use the currency argument
        bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}



#[derive(Accounts)]
pub struct CreateContribution<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<PoolContribution>(),
        seeds = [b"contribution", pool.key().as_ref(), maker.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, PoolContribution>,
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub maker: Account<'info, Maker>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct CreateTransaction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Transaction>(),
        seeds = [b"transaction", pool.key().as_ref(), maker.key().as_ref()],
        bump
    )]
    pub transaction: Account<'info, Transaction>,
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub maker: Account<'info, Maker>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyMaker<'info> {
    #[account(mut, seeds = [b"maker", authority.key().as_ref()], bump)]
    pub maker: Account<'info, Maker>,
    #[account(mut)]
    pub authority: Signer<'info>,
}



#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub maker: Account<'info, Maker>,
    #[account(mut, has_one = pool, has_one = maker)]
    pub contribution: Account<'info, PoolContribution>,
    #[account(
        mut, //  mutable 
        seeds = [b"transaction", pool.key().as_ref(), maker.key().as_ref()],
        bump
    )]
    pub transaction: Account<'info, Transaction>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
// Accounts for Withdraw instruction
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub maker: Account<'info, Maker>,
    #[account(mut, has_one = pool, has_one = maker)]
    pub contribution: Account<'info, PoolContribution>,
    #[account(
        mut,
        seeds = [b"transaction", pool.key().as_ref(), maker.key().as_ref()],
        bump
    )]
    pub transaction: Account<'info, Transaction>, // Remove `init`, make mutable
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}



// Pool account
#[account]
pub struct Pool {
    pub currency: [u8; 3], // Fixed-size array for currency
    pub total_liquidity: u64,
    pub status: PoolStatus,
    pub bump: u8,
}

// Maker account
#[account]
pub struct Maker {
    pub authority: Pubkey,
    pub verified_status: MakerStatus,
    pub bump: u8,
}

// PoolContribution account
#[account]
pub struct PoolContribution {
    pub pool: Pubkey,
    pub maker: Pubkey,
    pub amount: u64,
    pub bump: u8,
}


#[account]
pub struct Transaction {
    pub pool: Pubkey,
    pub maker: Pubkey,
    pub transaction_type: TransactionType,
    pub amount: u64,
    pub status: TransactionStatus,
    pub bump: u8,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PoolStatus {
    Active,
    Paused,
    Closed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MakerStatus {
    Verified,
    Pending,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TransactionType {
    Deposit,
    Withdrawal,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
}


#[error_code]
pub enum ErrorCode {
    #[msg("Maker is not verified")]
    MakerNotVerified,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}
