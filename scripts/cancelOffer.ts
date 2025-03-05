import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

async function cancelOffer(customMint: PublicKey) { // Pass customMint as a parameter
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load the local wallet keypair from Solana config
  const walletKeyPair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(require('fs').readFileSync(
      process.env.HOME + "/.config/solana/id.json",
      "utf8"
    )))
  );
  
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeyPair),
    { commitment: "confirmed" }
  );
  
  anchor.setProvider(provider);
  const program = anchor.workspace.LiquidityPool as Program<LiquidityPool>;

  const taker = provider.wallet;
  const nonce = 1234567890; // Replace with the nonce from depositFunds

  // Use the custom mint from depositFunds instead of USDC
  // const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // No longer needed

  // Taker’s custom token account
  const takerTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    walletKeyPair, // Use Keypair as payer/signer
    customMint, // Use the custom mint passed as parameter
    taker.publicKey
  );

  // Program’s custom token account
  const [programTokenPda] = await PublicKey.findProgramAddress(
    [Buffer.from("program_token_account")],
    program.programId
  );
  const programTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    walletKeyPair, // Use Keypair as payer/signer
    customMint, // Use the custom mint
    programTokenPda,
    true // Allow owner off-curve (PDA)
  );

  // Transaction PDA from deposit
  const [transactionPda] = await PublicKey.findProgramAddress(
    [Buffer.from("transaction"), taker.publicKey.toBuffer(), new anchor.BN(nonce).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // Program authority PDA
  const [programAuthority] = await PublicKey.findProgramAddress(
    [Buffer.from("program_authority")],
    program.programId
  );

  await program.methods
  .cancelOffer()
  .accounts({
    transaction: transactionPda,
    taker: taker.publicKey,
    takerTokenAccount: takerTokenAccount.address,
    programTokenAccount: programTokenAccount.address,
    programTokenPda: programTokenPda, // Updated
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([walletKeyPair])
  .rpc();

  console.log("Offer canceled and refunded");

  const transactionAccount = await program.account.transaction.fetch(transactionPda);
  console.log("Transaction Status:", transactionAccount.status);
}

// Example usage: Replace with the actual customMint from depositFunds
const customMint = new PublicKey("<custom-mint-public-key>"); // Replace with the actual customMint from depositFunds
cancelOffer(customMint).catch(console.error);