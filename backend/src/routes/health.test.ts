import { describe, it, expect } from 'vitest'
import { healthRoutes } from './health.js'

describe('Health Routes & Endpoints', () => {
  it('exports a valid Express router', () => {
    expect(healthRoutes).toBeDefined()
    expect(typeof healthRoutes).toBe('function')
  })

  it('handles GET / health status endpoint', () => {
    const mockReq: any = {}
    let responseData: any = null
    const mockRes: any = {
      json: (data: any) => {
        responseData = data
        return mockRes
      },
    }

    // Call route stack handler directly for '/'
    const rootRoute = (healthRoutes as any).stack.find((layer: any) => layer.route?.path === '/')
    expect(rootRoute).toBeDefined()

    rootRoute.route.stack[0].handle(mockReq, mockRes)
    expect(responseData).toBeDefined()
    expect(responseData.status).toBe('ok')
    expect(typeof responseData.uptime).toBe('number')
    expect(typeof responseData.timestamp).toBe('string')
    expect(responseData.environment).toBeDefined()
  })

  it('handles GET /ready endpoint', () => {
    const mockReq: any = {}
    let responseData: any = null
    const mockRes: any = {
      json: (data: any) => {
        responseData = data
        return mockRes
      },
    }

    const readyRoute = (healthRoutes as any).stack.find((layer: any) => layer.route?.path === '/ready')
    expect(readyRoute).toBeDefined()

    readyRoute.route.stack[0].handle(mockReq, mockRes)
    expect(responseData).toEqual({ status: 'ready' })
  })

  it('handles GET /live endpoint', () => {
    const mockReq: any = {}
    let responseData: any = null
    const mockRes: any = {
      json: (data: any) => {
        responseData = data
        return mockRes
      },
    }

    const liveRoute = (healthRoutes as any).stack.find((layer: any) => layer.route?.path === '/live')
    expect(liveRoute).toBeDefined()

    liveRoute.route.stack[0].handle(mockReq, mockRes)
    expect(responseData).toEqual({ status: 'alive' })
  })
})
