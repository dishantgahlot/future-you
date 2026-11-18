import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import crypto from 'crypto'
import { config } from '../../config/index.js'

// Types
export interface GeminiResponse<T = string> {
  success: boolean
  data?: T
  model?: string
  error?: {
    code: string
    message: string
    retryable: boolean
    details?: any
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface GeminiClientOptions {
  apiKey?: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  timeout?: number
  maxRetries?: number
  systemInstruction?: string
  noCache?: boolean
  thinkingBudget?: number
}

// Global Circuit Breaker to prevent slow cascading timeouts when quota or service fails
let circuitBreakerOpenUntil = 0
let circuitBreakerReason = ''

export function tripCircuitBreaker(reason: string, durationMs: number = 60000): void {
  circuitBreakerOpenUntil = Date.now() + durationMs
  circuitBreakerReason = reason
  console.warn(`[Gemini Circuit Breaker] Tripped (${reason}) - Bypassing Gemini calls for ${Math.round(durationMs / 1000)}s`)
}

export function isCircuitBreakerOpen(): boolean {
  if (Date.now() < circuitBreakerOpenUntil) {
    return true
  }
  if (circuitBreakerOpenUntil > 0) {
    circuitBreakerOpenUntil = 0
    circuitBreakerReason = ''
    console.info('[Gemini Circuit Breaker] Reset - Resuming Gemini calls')
  }
  return false
}

// In-memory cache for prompt results (5 min TTL)
const responseCache = new Map<string, { data: any; expiry: number }>()

function getCachedResult<T>(cacheKey: string): T | null {
  const cached = responseCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T
  }
  if (cached) {
    responseCache.delete(cacheKey)
  }
  return null
}

function setCachedResult(cacheKey: string, data: any, ttlMs: number = 300000): void {
  // Keep cache small
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value
    if (firstKey) responseCache.delete(firstKey)
  }
  responseCache.set(cacheKey, { data, expiry: Date.now() + ttlMs })
}

const DEFAULT_OPTIONS: Required<Omit<GeminiClientOptions, 'apiKey' | 'systemInstruction' | 'noCache' | 'thinkingBudget'>> & {
  apiKey?: string
  systemInstruction?: string
  noCache?: boolean
  thinkingBudget?: number
} = {
  apiKey: undefined,
  model: config.gemini.model || 'gemini-3.5-flash-lite',
  temperature: 0.7,
  maxOutputTokens: 2048,
  topP: 0.95,
  topK: 40,
  timeout: 10000, // 10s timeout for fast failover
  maxRetries: 0,
  systemInstruction: undefined,
  noCache: false,
  thinkingBudget: 0, // 0 disables lengthy reasoning chains for fast structured answers
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
]

/**
 * Custom error class for Gemini API errors
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly statusCode?: number,
    public readonly details?: any
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

/**
 * Gemini API Client with Circuit Breaker, Caching, and Fast Failover
 */
export class GeminiClient {
  private client: GoogleGenerativeAI
  private model: GenerativeModel
  private options: GeminiClientOptions & {
    model: string
    temperature: number
    maxOutputTokens: number
    topP: number
    topK: number
    timeout: number
    maxRetries: number
  }
  private requestCount: number = 0

  constructor(options: GeminiClientOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    const activeKey = options.apiKey || config.gemini.apiKey
    if (!activeKey) {
      throw new GeminiError(
        'Gemini API key not configured',
        'MISSING_API_KEY',
        false,
        500
      )
    }

    this.client = new GoogleGenerativeAI(activeKey)
    const modelParams: any = {
      model: this.options.model || 'gemini-2.5-flash',
      generationConfig: {
        temperature: this.options.temperature,
        maxOutputTokens: this.options.maxOutputTokens,
        topP: this.options.topP,
        topK: this.options.topK,
      },
    }
    if (this.options.thinkingBudget !== undefined) {
      modelParams.generationConfig.thinkingConfig = {
        thinkingBudget: this.options.thinkingBudget,
      }
    }
    if (this.options.systemInstruction) {
      modelParams.systemInstruction = this.options.systemInstruction
    }
    this.model = this.client.getGenerativeModel(modelParams)
  }

  /**
   * Helper to execute a promise with strict timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: any
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new GeminiError(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT', false, 504))
      }, timeoutMs)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      clearTimeout(timeoutHandle)
    }
  }

  /**
   * Get candidate models in priority order for automatic failover
   */
  private getCandidateModels(): string[] {
    const list = [
      this.options.model,
      config.gemini.model,
      ...CANDIDATE_MODELS,
    ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i)
    return list
  }

  /**
   * Generate content with candidate model cascade, circuit breaker, and fast failover
   */
  async generateContent(prompt: string | string[]): Promise<GeminiResponse> {
    const promptString = Array.isArray(prompt) ? prompt.join('\n\n') : prompt

    // 1. Check Circuit Breaker
    if (isCircuitBreakerOpen()) {
      return {
        success: false,
        error: {
          code: 'CIRCUIT_OPEN',
          message: `Gemini paused due to ${circuitBreakerReason}. Using instant fallback.`,
          retryable: false,
        },
      }
    }

    // 2. Check Cache with SHA-256 hash (never collide or return previous prompt's cached answer)
    const promptHash = crypto.createHash('sha256').update(`${this.options.systemInstruction || ''}::${promptString}`).digest('hex')
    const cacheKey = `txt_${this.options.model}_${promptHash}`
    if (!this.options.noCache) {
      const cached = getCachedResult<string>(cacheKey)
      if (cached) {
        return { success: true, data: cached }
      }
    }

    const modelsToTry = this.getCandidateModels().slice(0, 3)
    let lastError: any = null
    const overallStart = Date.now()

    for (const modelName of modelsToTry) {
      if (Date.now() - overallStart > 30000) break
      try {
        this.requestCount++
        const startTime = Date.now()

        const modelParams: any = {
          model: modelName,
          generationConfig: {
            temperature: this.options.temperature,
            maxOutputTokens: this.options.maxOutputTokens,
            topP: this.options.topP,
            topK: this.options.topK,
          },
        }
        if (this.options.thinkingBudget !== undefined) {
          modelParams.generationConfig.thinkingConfig = {
            thinkingBudget: this.options.thinkingBudget,
          }
        }
        if (this.options.systemInstruction) {
          modelParams.systemInstruction = this.options.systemInstruction
        }
        const activeModel = this.client.getGenerativeModel(modelParams)

        const result = await this.withTimeout(
          activeModel.generateContent(promptString),
          this.options.timeout
        )

        const response = result.response
        const text = response.text()
        const duration = Date.now() - startTime
        console.log(`[Gemini] Request completed with ${modelName} in ${duration}ms`)

        if (!this.options.noCache) {
          setCachedResult(cacheKey, text)
        }

        return {
          success: true,
          data: text,
          model: modelName,
          usage: this.extractUsage(response),
        }
      } catch (error) {
        lastError = error
        const geminiError = this.parseError(error)
        console.warn(`[Gemini] Model ${modelName} failed (${geminiError.code}), trying next candidate...`)
        if (geminiError.code === 'RATE_LIMIT' || geminiError.code === 'FORBIDDEN' || geminiError.code === 'INVALID_API_KEY') {
          tripCircuitBreaker(geminiError.code, 60000)
          break
        }
      }
    }

    // All models failed
    const finalGeminiError = this.parseError(lastError)
    if (finalGeminiError.code === 'RATE_LIMIT' || finalGeminiError.code === 'FORBIDDEN' || finalGeminiError.code === 'INVALID_API_KEY') {
      tripCircuitBreaker(finalGeminiError.code, 60000)
    }

    console.warn(`[Gemini] All candidate models failed: ${finalGeminiError.code} - ${finalGeminiError.message}`)
    return {
      success: false,
      error: {
        code: finalGeminiError.code,
        message: finalGeminiError.message,
        retryable: false,
        details: finalGeminiError.details,
      },
    }
  }

  /**
   * Generate JSON content with candidate model cascade, circuit breaker, and fast failover
   */
  async generateJSON<T>(prompt: string | string[], schema?: any): Promise<GeminiResponse<T>> {
    const promptString = Array.isArray(prompt) ? prompt.join('\n\n') : prompt

    // 1. Check Circuit Breaker
    if (isCircuitBreakerOpen()) {
      return {
        success: false,
        error: {
          code: 'CIRCUIT_OPEN',
          message: `Gemini paused due to ${circuitBreakerReason}. Using instant fallback.`,
          retryable: false,
        },
      }
    }

    // 2. Check Cache
    const jsonPrompt = this.buildJSONPrompt(promptString, schema)
    const promptHash = crypto.createHash('sha256').update(`${this.options.systemInstruction || ''}::${jsonPrompt}`).digest('hex')
    const cacheKey = `json_${this.options.model}_${promptHash}`
    if (!this.options.noCache) {
      const cached = getCachedResult<T>(cacheKey)
      if (cached) {
        return { success: true, data: cached }
      }
    }

    const modelsToTry = this.getCandidateModels().slice(0, 3)
    let lastError: any = null
    const overallStart = Date.now()

    for (const modelName of modelsToTry) {
      if (Date.now() - overallStart > 30000) break
      try {
        this.requestCount++
        const startTime = Date.now()

        const jsonModelParams: any = {
          model: modelName,
          generationConfig: {
            temperature: this.options.temperature,
            maxOutputTokens: this.options.maxOutputTokens,
            topP: this.options.topP,
            topK: this.options.topK,
            responseMimeType: 'application/json',
          },
        }
        if (this.options.thinkingBudget !== undefined) {
          jsonModelParams.generationConfig.thinkingConfig = {
            thinkingBudget: this.options.thinkingBudget,
          }
        }
        if (this.options.systemInstruction) {
          jsonModelParams.systemInstruction = this.options.systemInstruction
        }
        const jsonModel = this.client.getGenerativeModel(jsonModelParams)

        const result = await this.withTimeout(
          jsonModel.generateContent(jsonPrompt),
          this.options.timeout
        )

        const response = result.response
        const text = response.text()
        const duration = Date.now() - startTime
        console.log(`[Gemini] JSON Request completed with ${modelName} in ${duration}ms`)

        const parsed = this.parseJSONResponse<T>(text)
        if (!this.options.noCache) {
          setCachedResult(cacheKey, parsed)
        }

        return {
          success: true,
          data: parsed,
          model: modelName,
          usage: this.extractUsage(response),
        }
      } catch (error) {
        lastError = error
        const geminiError = this.parseError(error)
        console.warn(`[Gemini] JSON Model ${modelName} failed (${geminiError.code}), trying next candidate...`)
        if (geminiError.code === 'RATE_LIMIT' || geminiError.code === 'FORBIDDEN' || geminiError.code === 'INVALID_API_KEY') {
          tripCircuitBreaker(geminiError.code, 60000)
          break
        }
      }
    }

    // All models failed
    const finalGeminiError = this.parseError(lastError)
    if (finalGeminiError.code === 'RATE_LIMIT' || finalGeminiError.code === 'FORBIDDEN' || finalGeminiError.code === 'INVALID_API_KEY') {
      tripCircuitBreaker(finalGeminiError.code, 60000)
    }

    console.warn(`[Gemini] All JSON candidate models failed: ${finalGeminiError.code} - ${finalGeminiError.message}`)
    return {
      success: false,
      error: {
        code: finalGeminiError.code,
        message: finalGeminiError.message,
        retryable: false,
      },
    }
  }

  /**
   * Build a prompt that requests JSON output
   */
  private buildJSONPrompt(prompt: string | string[], schema?: any): string {
    const promptString = Array.isArray(prompt) ? prompt.join('\n\n') : prompt
    const schemaInstruction = schema
      ? `\n\nThe response MUST be valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
      : '\n\nThe response MUST be valid JSON only. No markdown, no explanations, no extra text.'

    return `${promptString}${schemaInstruction}\n\nReturn ONLY the JSON object.`
  }

  /**
   * Parse JSON from AI response, handling markdown code blocks
   */
  private parseJSONResponse<T>(response: string): T {
    let clean = response.trim()

    // Strip markdown code fences if present
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*\n?/, '')
      clean = clean.replace(/\n?```\s*$/, '')
      clean = clean.trim()
    } else {
      const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        clean = codeBlockMatch[1].trim()
      }
    }

    const firstBrace = clean.indexOf('{')
    const firstBracket = clean.indexOf('[')
    let startIdx = -1
    let endIdx = -1

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace
      endIdx = clean.lastIndexOf('}')
    } else if (firstBracket !== -1) {
      startIdx = firstBracket
      endIdx = clean.lastIndexOf(']')
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      clean = clean.substring(startIdx, endIdx + 1)
    }

    try {
      return JSON.parse(clean) as T
    } catch {
      // 1. Repair trailing commas and cleanup dangling incomplete key-values
      const repaired = clean
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, ' ')
      try {
        return JSON.parse(repaired) as T
      } catch {
        // 2. Auto-close truncated brackets/braces (strip trailing incomplete property before closing)
        let autoClosed = repaired
          .replace(/,\s*$/, '')
          .replace(/,\s*"[^"]*"\s*:\s*$/, '')
          .replace(/,\s*"[^"]*"\s*$/, '')
        let openBraces = (autoClosed.match(/{/g) || []).length - (autoClosed.match(/}/g) || []).length
        let openBrackets = (autoClosed.match(/\[/g) || []).length - (autoClosed.match(/\]/g) || []).length
        while (openBrackets > 0) { autoClosed += ']'; openBrackets-- }
        while (openBraces > 0) { autoClosed += '}'; openBraces-- }
        return JSON.parse(autoClosed) as T
      }
    }
  }

  /**
   * Extract token usage from response
   */
  private extractUsage(response: any): GeminiResponse['usage'] {
    try {
      const usage = response.usageMetadata
      if (usage) {
        return {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        }
      }
    } catch {
      // Ignore extraction errors
    }
    return undefined
  }

  /**
   * Parse error from Gemini API
   */
  private parseError(error: any): GeminiError {
    const msg = error?.message || String(error)

    if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('Too Many Requests') || msg.includes('ResourceExhausted')) {
      return new GeminiError('Rate/Quota limit exceeded', 'RATE_LIMIT', false, 429)
    }
    if (msg.includes('403') || msg.includes('Permission denied') || msg.includes('ACCESS_DENIED')) {
      return new GeminiError('Permission denied on Gemini API', 'FORBIDDEN', false, 403)
    }
    if (msg.includes('401') || msg.includes('API key not valid')) {
      return new GeminiError('Invalid Gemini API Key', 'INVALID_API_KEY', false, 401)
    }
    if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
      return new GeminiError('Gemini model temporarily unavailable or high demand', 'SERVICE_UNAVAILABLE', true, 503)
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return new GeminiError('Model not found', 'MODEL_NOT_FOUND', false, 404)
    }
    if (error.code === 'TIMEOUT' || msg.includes('timed out')) {
      return new GeminiError('Request timed out', 'TIMEOUT', false, 504)
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return new GeminiError('Network error connecting to Gemini API', 'NETWORK_ERROR', false, 503)
    }

    return new GeminiError(msg, 'UNKNOWN_ERROR', false, undefined, { originalError: error })
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      model: this.options.model,
      circuitBreakerOpen: isCircuitBreakerOpen(),
    }
  }
}

/**
 * Create a default client instance
 */
export function createGeminiClient(options?: GeminiClientOptions): GeminiClient {
  return new GeminiClient(options)
}

/**
 * Check if Gemini is available (has API key and circuit breaker is not tripped)
 */
export function isGeminiAvailable(): boolean {
  if (isCircuitBreakerOpen()) return false
  return !!config.gemini.apiKey && config.gemini.apiKey !== 'your_gemini_api_key'
}

/**
 * Convenience function for simple text generation
 */
export async function generateText(
  prompt: string | string[],
  options?: GeminiClientOptions
): Promise<GeminiResponse> {
  const client = createGeminiClient(options)
  return client.generateContent(prompt)
}

/**
 * Convenience function for JSON generation
 */
export async function generateJSON<T>(
  prompt: string | string[],
  schema?: any,
  options?: GeminiClientOptions
): Promise<GeminiResponse<T>> {
  const client = createGeminiClient(options)
  return client.generateJSON<T>(prompt, schema)
}

/**
 * Convenience function for text generation (non-JSON)
 */
export async function generateContent(
  prompt: string | string[],
  options?: GeminiClientOptions
): Promise<GeminiResponse> {
  const client = createGeminiClient(options)
  return client.generateContent(prompt)
}
