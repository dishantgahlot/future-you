import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const signUpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    full_name: z.string().min(1, 'Full name is required').max(100),
  }),
})

const signInSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
})

const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
})

describe('Auth Route Schemas & Security Validation', () => {
  describe('Sign Up Schema', () => {
    it('accepts valid signup request', () => {
      const valid = {
        body: {
          email: 'user@futureyou.ai',
          password: 'securePassword123!',
          full_name: 'Test Pilot',
        },
      }
      const result = signUpSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email formats', () => {
      const invalid = {
        body: {
          email: 'not-an-email',
          password: 'securePassword123!',
          full_name: 'Test Pilot',
        },
      }
      const result = signUpSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('rejects passwords shorter than 8 characters', () => {
      const invalid = {
        body: {
          email: 'user@futureyou.ai',
          password: 'short',
          full_name: 'Test Pilot',
        },
      }
      const result = signUpSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('rejects empty full_name', () => {
      const invalid = {
        body: {
          email: 'user@futureyou.ai',
          password: 'securePassword123!',
          full_name: '',
        },
      }
      const result = signUpSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('Sign In Schema', () => {
    it('accepts valid credentials', () => {
      const valid = {
        body: {
          email: 'user@futureyou.ai',
          password: 'anyPassword',
        },
      }
      const result = signInSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects missing password on sign in', () => {
      const invalid = {
        body: {
          email: 'user@futureyou.ai',
          password: '',
        },
      }
      const result = signInSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('Refresh Token Schema', () => {
    it('accepts valid refresh token payload', () => {
      const valid = {
        body: {
          refresh_token: 'refresh_token_abc_123',
        },
      }
      const result = refreshSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects empty refresh token', () => {
      const invalid = {
        body: {
          refresh_token: '',
        },
      }
      const result = refreshSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })
})
