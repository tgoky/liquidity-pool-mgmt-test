import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function createMaker() {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the program
  const program = anchor.workspace.LiquidityPool as Program<LiquidityPool>;

  // Generate the maker PDA
  const authority = provider.wallet.publicKey; // The authority's public key
  const [makerPda, makerBump] = await PublicKey.findProgramAddress(
    [Buffer.from("maker"), authority.toBuffer()], // Seeds: ["maker", authority.key().as_ref()]
    program.programId
  );

  // Create the maker account
  await program.methods
    .createMaker()
    .accounts({
      maker: makerPda,
      authority: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Maker account created:", makerPda.toBase58());
}

createMaker();