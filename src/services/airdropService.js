const { PublicKey, Transaction } = require('@solana/web3.js');
const { createTransferInstruction, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const { Helius } = require('helius-sdk');
const { getConnection, getKeypair, isValidSolanaAddress } = require('../utils/solana');
const config = require('../config');

// Initialize Helius SDK for ZK-compressed airdrops
let helius = null;
if (config.heliusApiKey) {
  helius = new Helius(config.heliusApiKey);
}

// Process airdrop using ZK compression for efficiency
async function processAirdrop(recipients) {
  const connection = getConnection();
  const payer = getKeypair();
  const tokenMintPublicKey = new PublicKey(config.tokenMintAddress);
  
  console.log(`Starting airdrop to ${recipients.length} recipients...`);
  
  try {
    // Get sender token account
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      tokenMintPublicKey,
      payer.publicKey
    );
    
    // For small batches (less than 10), use traditional transfer method
    if (recipients.length < 10) {
      return await processTraditionalAirdrop(recipients, connection, payer, senderTokenAccount, tokenMintPublicKey);
    }
     
    // For larger batches, use ZK compression method
    return await processZkCompressedAirdrop(recipients, connection, payer, tokenMintPublicKey);
  } catch (error) {
    console.error('Error processing airdrop:', error);
    throw new Error(`Airdrop failed: ${error.message}`);
  }
}

// For small batches, use traditional SPL token transfers
async function processTraditionalAirdrop(recipients, connection, payer, senderTokenAccount, tokenMintPublicKey) {
  const results = [];
  const failedRecipients = [];
  
  for (const recipient of recipients) {
    try {
      if (!isValidSolanaAddress(recipient.address)) {
        failedRecipients.push({ address: recipient.address, reason: 'Invalid address' });
        continue;
      }
      
      const recipientPublicKey = new PublicKey(recipient.address);
      const amount = Math.round(recipient.amount * Math.pow(10, 9)); // Assuming 9 decimals
      
      // Get or create recipient token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        tokenMintPublicKey,
        recipientPublicKey
      );
      
      // Create transfer instruction
      const transferIx = createTransferInstruction(
        senderTokenAccount.address,
        recipientTokenAccount.address,
        payer.publicKey,
        BigInt(amount)
      );
      
      // Create and send transaction
      const tx = new Transaction().add(transferIx);
      const signature = await connection.sendTransaction(tx, [payer]);
      await connection.confirmTransaction(signature);
      
      results.push({
        address: recipient.address,
        amount: recipient.amount,
        signature,
        success: true
      });
      
    } catch (error) {
      console.error(`Error sending to ${recipient.address}:`, error);
      failedRecipients.push({ address: recipient.address, reason: error.message });
    }
  }
  
  return {
    successful: results,
    failed: failedRecipients,
    method: 'traditional'
  };
}

// For larger batches, use ZK compression 
async function processZkCompressedAirdrop(recipients, connection, payer, tokenMintPublicKey) {
  if (!helius) {
    throw new Error('Helius API key not configured for ZK compressed airdrops');
  }

  try {
    // Format recipients for AirShip compatible format
    const formattedRecipients = recipients.map(r => ({
      address: r.address,
      amount: r.amount
    }));
    
    // Using Helius SDK to process compressed airdrop
    const airdropResponse = await helius.airshipAirdrop({
      tokenMint: tokenMintPublicKey.toString(),
      recipients: formattedRecipients,
      senderPrivateKey: Array.from(payer.secretKey), // Convert to array for the SDK
      rpcUrl: config.rpcEndpoint
    });
    
    return {
      successful: recipients.map(r => ({
        address: r.address,
        amount: r.amount,
        success: true
      })),
      txHash: airdropResponse.signature,
      method: 'zk-compressed'
    };
  } catch (error) {
    console.error('Error in ZK compressed airdrop:', error);
    throw error;
  }
}

// Validate recipient data
function validateRecipients(recipients) {
  if (!Array.isArray(recipients)) {
    throw new Error('Recipients must be an array');
  }
  
  if (recipients.length === 0) {
    throw new Error('Recipients array cannot be empty');
  }
  
  const validatedRecipients = [];
  const errors = [];
  
  recipients.forEach((recipient, index) => {
    if (!recipient.address || !recipient.amount) {
      errors.push(`Recipient at index ${index} missing address or amount`);
      return;
    }
    
    if (!isValidSolanaAddress(recipient.address)) {
      errors.push(`Invalid Solana address at index ${index}: ${recipient.address}`);
      return;
    }
    
    const amount = parseFloat(recipient.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Invalid amount at index ${index}: ${recipient.amount}`);
      return;
    }
    
    validatedRecipients.push({
      address: recipient.address,
      amount: amount
    });
  });
  
  return { validatedRecipients, errors };
}

module.exports = {
  processAirdrop,
  validateRecipients
};
