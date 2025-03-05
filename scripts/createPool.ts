import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool"
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function createPool() {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the program
  const program = anchor.workspace.LiquidityPool as Program<LiquidityPool>;

  // Convert "USD" to a byte array
  const currency = new TextEncoder().encode("USD");

  // Generate a new pool PDA
  const [poolPda, poolBump] = await PublicKey.findProgramAddress(
    [Buffer.from("pool"), currency],
    program.programId
  );

  // Create the pool
  await program.methods
    .createPool([85, 83, 68], new anchor.BN(1000)) // "USD" as [u8; 3]
    .accounts({
      pool: poolPda,
      authority: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Pool created:", poolPda.toBase58());
}

createPool();