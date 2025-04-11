const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { RateLimiterMemory } = require('rate-limiter-flexible')
const routes = require('./routes/airdrop')
const config = require('./config')

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 60, // per minute
})

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip)
    next()
  } catch (error) {
    res.status(429).json({ error: 'Too many requests, please try again later' })
  }
})

// Routes
app.use('/api', routes)

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

app.listen(config.port, () => {
  console.log(`Airdrop service running on port ${config.port}`)
})