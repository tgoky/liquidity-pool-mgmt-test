import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { PublicKey, SystemProgram, Connection, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createMint, mintTo } from "@solana/spl-token";

async function depositFunds() {
  // Connect to Devnet
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

  // Step 1: Create a custom token mint
  const customMint = await createMint(
    provider.connection,
    walletKeyPair, // Use Keypair as payer/signer
    taker.publicKey, // Mint authority
    null, // Freeze authority (optional, set to null if not needed)
    6 // Decimals (e.g., 6 for USDC-like tokens)
  );

  console.log("Custom Token Mint Address:", customMint.toBase58());

  // Step 2: Create or get taker's token account for the custom token
  const takerTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    walletKeyPair, // Use Keypair as payer/signer
    customMint, // Custom token mint address
    taker.publicKey // Taker's address
  );

  console.log("Taker Token Account:", takerTokenAccount.address.toBase58());

  // Step 3: Mint custom tokens to the taker's token account
  await mintTo(
    provider.connection,
    walletKeyPair, // Use Keypair as payer/signer
    customMint, // Custom token mint address
    takerTokenAccount.address, // Taker's token account
    walletKeyPair, // Mint authority (using the same keypair)
    100 * 10 ** 6 // Amount to mint (e.g., 100 tokens with 6 decimals)
  );

  console.log("Minted custom tokens to taker's account");

  // Step 4: Create or get program's token account for the custom token
  const [programTokenPda] = await PublicKey.findProgramAddress(
    [Buffer.from("program_token_account")],
    program.programId
  );
  const programTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    walletKeyPair, // Use Keypair as payer/signer
    customMint, // Custom token mint address
    programTokenPda, // Program-derived address as owner
    true // Allow owner off-curve (PDA)
  );

  console.log("Program Token Account:", programTokenAccount.address.toBase58());

  // Unique nonce
  const nonce = Date.now();

  // Derive transaction PDA
  const [transactionPda] = await PublicKey.findProgramAddress(
    [Buffer.from("transaction"), taker.publicKey.toBuffer(), new anchor.BN(nonce).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // Deposit 10 custom tokens with exchange rate 1 token = 1 USD
  const amount = 10 * 10 ** 6; // 10 tokens (6 decimals)
  const exchangeRate = 1 * 10 ** 6; // 1 USD (same decimals for simplicity)

  await program.methods
    .depositFunds(new anchor.BN(amount), new anchor.BN(exchangeRate), new anchor.BN(nonce))
    .accounts({
      transaction: transactionPda,
      taker: taker.publicKey,
      takerTokenAccount: takerTokenAccount.address,
      programTokenAccount: programTokenAccount.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([walletKeyPair]) // Explicitly include signer
    .rpc();

  console.log("Deposit successful");

  // Verify state
  console.log("Nonce:", nonce);
  console.log("Taker Public Key:", taker.publicKey.toBase58());
  const transactionAccount = await program.account.transaction.fetch(transactionPda);
  console.log("Transaction Details:");
  console.log("  Taker:", transactionAccount.taker.toBase58());
  console.log("  Amount:", transactionAccount.amount.toString());
  console.log("  Exchange Rate:", transactionAccount.exchangeRate.toString());
  console.log("  Status:", transactionAccount.status);
}

depositFunds().catch(console.error);