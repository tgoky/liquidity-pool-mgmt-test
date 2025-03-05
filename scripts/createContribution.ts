import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function createContribution() {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the program
  const program = anchor.workspace.LiquidityPool as Program<LiquidityPool>;

  // Generate the pool PDA
  const currency = new TextEncoder().encode("USD"); // Example: "USD" as currency
  const [poolPda, poolBump] = await PublicKey.findProgramAddress(
    [Buffer.from("pool"), currency],
    program.programId
  );

  // Generate the maker PDA
  const authority = provider.wallet.publicKey; // The authority's public key
  const [makerPda, makerBump] = await PublicKey.findProgramAddress(
    [Buffer.from("maker"), authority.toBuffer()], // Seeds: ["maker", authority.key().as_ref()]
    program.programId
  );

  // Generate a contribution PDA
  const [contributionPda, contributionBump] = await PublicKey.findProgramAddress(
    [Buffer.from("contribution"), poolPda.toBuffer(), makerPda.toBuffer()],
    program.programId
  );

  // Create the contribution account
  await program.methods
    .createContribution()
    .accounts({
      contribution: contributionPda,
      pool: poolPda,
      maker: makerPda,
      authority: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Contribution account created:", contributionPda.toBase58());
}

createContribution();