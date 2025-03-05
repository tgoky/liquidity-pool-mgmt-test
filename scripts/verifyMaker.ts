import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { PublicKey } from "@solana/web3.js";

async function verifyMaker() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.LiquidityPool as Program<LiquidityPool>;

  const [makerPda] = await PublicKey.findProgramAddress(
    [Buffer.from("maker"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .verifyMaker()
    .accounts({
      maker: makerPda,
      authority: provider.wallet.publicKey,
    })
    .rpc();

  console.log("Maker verified");
}

verifyMaker().catch(console.error);