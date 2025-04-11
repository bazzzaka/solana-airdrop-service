require('dotenv').config()

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  solanaNetwork: process.env.SOLANA_NETWORK || 'devnet',
  rpcEndpoint: process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com',
  heliusApiKey: process.env.HELIUS_API_KEY,
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
  tokenMintAddress: process.env.TOKEN_MINT_ADDRESS,
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
}