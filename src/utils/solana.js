const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const bs58 = require('bs58');
const config = require('../config');

// Create connection to Solana network
function getConnection() {
  return new Connection(config.rpcEndpoint, 'confirmed');
}

// Get keypair from private key
function getKeypair() {
  if (!config.walletPrivateKey) {
    throw new Error('Wallet private key not configured');
  }
  
  const secretKey = bs58.decode(config.walletPrivateKey);
  return Keypair.fromSecretKey(secretKey);
}

// Validate Solana address
function isValidSolanaAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

// Get token account for recipient
async function getTokenAccount(connection, payer, mint, recipient) {
  const recipientPublicKey = new PublicKey(recipient);
  const mintPublicKey = new PublicKey(mint);
  
  return await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPublicKey,
    recipientPublicKey
  );
}

module.exports = {
  getConnection,
  getKeypair,
  isValidSolanaAddress,
  getTokenAccount
};
