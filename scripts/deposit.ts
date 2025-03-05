// import * as anchor from "@project-serum/anchor";
// import { Program } from "@project-serum/anchor";
// import { LiquidityPool } from "../target/types/liquidity_pool"
// import { PublicKey, SystemProgram } from "@solana/web3.js";

// async function deposit() {
//   // Configure the client to use the local cluster
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);

//   // Load the program
//   const program = anchor.workspace.LiquidityPool as Program<LiquidityPool>;

//   // Generate the pool PDA
//   const currency = new TextEncoder().encode("USD"); // Example: "USD" as currency
//   const [poolPda, poolBump] = await PublicKey.findProgramAddress(
//     [Buffer.from("pool"), currency],
//     program.programId
//   );

//   // Generate the maker PDA
//   const authority = provider.wallet.publicKey; // The authority's public key
//   const [makerPda, makerBump] = await PublicKey.findProgramAddress(
//     [Buffer.from("maker"), authority.toBuffer()], // Seeds: ["maker", authority.key().as_ref()]
//     program.programId
//   );

//   // Generate a contribution PDA
//   const [contributionPda, contributionBump] = await PublicKey.findProgramAddress(
//     [Buffer.from("contribution"), poolPda.toBuffer(), makerPda.toBuffer()],
//     program.programId
//   );

//   // Generate a transaction PDA
//   const [transactionPda, transactionBump] = await PublicKey.findProgramAddress(
//     [Buffer.from("transaction"), poolPda.toBuffer(), makerPda.toBuffer()],
//     program.programId
//   );

//   // Deposit funds
//   await program.methods
//     .deposit(new anchor.BN(500)) // 500 as deposit amount
//     .accounts({
//       pool: poolPda,
//       maker: makerPda,
//       contribution: contributionPda,
//       transaction: transactionPda,
//       authority: provider.wallet.publicKey,
//       systemProgram: SystemProgram.programId,
//     })
//     .rpc();

//   console.log("Deposit successful");
// }

// deposit();

import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function deposit() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.LiquidityPool as Program<LiquidityPool>;

  const currency = new TextEncoder().encode("USD");
  const [poolPda] = await PublicKey.findProgramAddress(
    [Buffer.from("pool"), currency],
    program.programId
  );

  const authority = provider.wallet.publicKey;
  const [makerPda] = await PublicKey.findProgramAddress(
    [Buffer.from("maker"), authority.toBuffer()],
    program.programId
  );

  const [contributionPda] = await PublicKey.findProgramAddress(
    [Buffer.from("contribution"), poolPda.toBuffer(), makerPda.toBuffer()],
    program.programId
  );

  const [transactionPda] = await PublicKey.findProgramAddress(
    [Buffer.from("transaction"), poolPda.toBuffer(), makerPda.toBuffer()],
    program.programId
  );

  // Fetch initial state (optional, for comparison)
  const initialPool = await program.account.pool.fetch(poolPda);
  const initialContribution = await program.account.poolContribution.fetch(contributionPda);
  const initialTransaction = await program.account.transaction.fetch(transactionPda);
  console.log("Before Deposit:");
  console.log("Pool Total Liquidity:", initialPool.totalLiquidity.toString());
  console.log("Contribution Amount:", initialContribution.amount.toString());
  console.log("Transaction Amount:", initialTransaction.amount.toString(), "Status:", initialTransaction.status);

  // Perform the deposit
  await program.methods
    .deposit(new anchor.BN(500))
    .accounts({
      pool: poolPda,
      maker: makerPda,
      contribution: contributionPda,
      transaction: transactionPda,
      authority: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Deposit successful");

  // Fetch updated state
  const updatedPool = await program.account.pool.fetch(poolPda);
  const updatedContribution = await program.account.poolContribution.fetch(contributionPda);
  const updatedTransaction = await program.account.transaction.fetch(transactionPda);

  console.log("After Deposit:");
  console.log("Pool Total Liquidity:", updatedPool.totalLiquidity.toString());
  console.log("Contribution Amount:", updatedContribution.amount.toString());
  console.log("Transaction Details:");
  console.log("  Type:", updatedTransaction.transactionType);
  console.log("  Amount:", updatedTransaction.amount.toString());
  console.log("  Status:", updatedTransaction.status);
}

deposit().catch(console.error);