import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '7d',
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
}

export function validateConfig() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GROQ_API_KEY',
    'JWT_SECRET',
  ]

  // Optional - Gemini API key (fallbacks available)
  const optional = ['GEMINI_API_KEY']

  const missing = required.filter(key => !process.env[key])
  const missingOptional = optional.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missing.join(', ')}`)
  }

  if (missingOptional.length > 0) {
    console.info(`ℹ️  Missing optional environment variables (fallbacks will be used): ${missingOptional.join(', ')}`)
  }

  return missing.length === 0
}