import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { LiquidityPool } from "../target/types/liquidity_pool";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

async function acceptOffer(customMint: PublicKey) {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
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

  const maker = provider.wallet;
  const takerPubkey = new PublicKey("DopriX5bpaPmutNnbxf3scduGUZKrZWpvb286WK8p1SY"); // From depositFunds
  const nonce = 1741207081094; // From depositFunds

  const makerTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    walletKeyPair,
    customMint,
    maker.publicKey
  );

  const [programTokenPda] = await PublicKey.findProgramAddress(
    [Buffer.from("program_token_account")],
    program.programId
  );
  const programTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    walletKeyPair,
    customMint,
    programTokenPda,
    true
  );

  const [transactionPda] = await PublicKey.findProgramAddress(
    [Buffer.from("transaction"), takerPubkey.toBuffer(), new anchor.BN(nonce).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  await program.methods
    .acceptOffer()
    .accounts({
      transaction: transactionPda,
      taker: takerPubkey,
      maker: maker.publicKey,
      makerTokenAccount: makerTokenAccount.address,
      programTokenAccount: programTokenAccount.address,
      programTokenPda: programTokenPda, // Renamed from programAuthority to match Rust
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([walletKeyPair])
    .rpc();

  console.log("Offer accepted");

  const transactionAccount = await program.account.transaction.fetch(transactionPda);
  console.log("Transaction Status:", transactionAccount.status);
}

const customMint = new PublicKey("3fn4QaNsFMbnysifTZ7eEDTFaaT1hxL4fYUpkRzBeTq9");
acceptOffer(customMint).catch(console.error);