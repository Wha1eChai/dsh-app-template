import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.js'
import {
  handleStatus,
  hostNameOf,
  isLoopbackAddress,
  json,
  registerHelloRoutes,
  rejectForeignCaller,
  STATUS_PATH,
} from '../src/http.js'

function req(overrides: { method?: string; url?: string; remote?: string; host?: string } = {}) {
  return {
    method: overrides.method ?? 'GET',
    url: overrides.url ?? STATUS_PATH,
    headers: { host: overrides.host ?? 'localhost:8080' },
    socket: { remoteAddress: overrides.remote ?? '127.0.0.1' },
  } as never
}

function res() {
  const response = new EventEmitter() as EventEmitter & { writeHead: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; status?: number; body?: string }
  response.writeHead = vi.fn((status: number) => { response.status = status })
  response.end = vi.fn((body?: string) => { response.body = body })
  return response
}

describe('http helpers', () => {
  it('recognizes loopback addresses and host headers', () => {
    expect(isLoopbackAddress(undefined)).toBe(false)
    expect(isLoopbackAddress('::1')).toBe(true)
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('10.0.0.1')).toBe(false)
    expect(hostNameOf(undefined)).toBeNull()
    expect(hostNameOf('[::1]:80')).toBe('::1')
    expect(hostNameOf('[::1]x')).toBeNull()
    expect(hostNameOf('[')).toBeNull()
    expect(hostNameOf('example.com:80')).toBe('example.com')
    expect(hostNameOf('2001:db8::1')).toBe('2001:db8::1')
    expect(hostNameOf('localhost.')).toBe('localhost')
    expect(hostNameOf('localhost:x')).toBeNull()
    const denied = res()
    expect(rejectForeignCaller(req({ method: 'POST' }), denied as never)).toBe(true)
    expect(denied.status).toBe(405)
    const foreign = res()
    expect(rejectForeignCaller(req({ remote: '8.8.8.8' }), foreign as never)).toBe(true)
    expect(foreign.status).toBe(403)
    json(res() as never, 200, { ok: true })
  })
})

describe('hello routes', () => {
  it('serves status on loopback', () => {
    const response = res()
    handleStatus(req(), response as never)
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body ?? '{}')).toEqual({ ok: true, status: 'ready', appId: 'acme.hello' })
  })

  it('rejects foreign callers through handleStatus', () => {
    const response = res()
    handleStatus(req({ remote: '8.8.8.8' }), response as never)
    expect(response.status).toBe(403)
  })

  it('accepts localhost host headers on loopback sockets', () => {
    const response = res()
    expect(rejectForeignCaller(req({ host: 'localhost:8080' }), response as never)).toBe(false)
  })

  it('registers the exact route and never throws', () => {
    const registered: string[] = []
    const register = (route: { path: string }) => {
      registered.push(route.path)
      return () => {}
    }
    const ctx = {
      logger: { warn: vi.fn() },
      effect: (fn: () => () => void) => { fn() },
      get: (name: string) => name === 'webServer' ? { register } : undefined,
    }
    registerHelloRoutes(ctx)
    expect(registered).toEqual([STATUS_PATH])
    registerHelloRoutes({ get: () => undefined })
    apply()
    apply({ get: () => { throw new Error('outer') } })
    const injectBoom = { inject: () => { throw new Error('inject') }, logger: { warn: vi.fn() }, get: () => undefined }
    apply(injectBoom)
    expect(injectBoom.logger.warn).toHaveBeenCalled()
    const injected: string[] = []
    apply({
      inject: (_deps, callback) => {
        callback({
          effect: (fn: () => () => void) => { fn() },
          get: (name: string) => name === 'webServer'
            ? {
              register: (route: { path: string }) => {
                injected.push(route.path)
                return () => {}
              },
            }
            : undefined,
        })
      },
    })
    expect(injected).toEqual([STATUS_PATH])
    apply({
      get: (name: string) => name === 'webServer'
        ? { register: () => { throw new Error('all') } }
        : undefined,
      logger: { warn: vi.fn() },
    })
    const throwing = {
      get: (name: string) => {
        if (name === 'webServer') throw new Error('boom')
        return undefined
      },
      logger: { warn: vi.fn() },
    }
    registerHelloRoutes(throwing)
    expect(throwing.logger.warn).not.toHaveBeenCalled()
    const explodingEffect = {
      logger: { warn: vi.fn() },
      effect: () => { throw new Error('effect') },
      get: (name: string) => name === 'webServer' ? { register: () => () => {} } : undefined,
    }
    registerHelloRoutes(explodingEffect)
    expect(explodingEffect.logger.warn).toHaveBeenCalled()
    const handlers: Array<(req: never, res: never) => void> = []
    registerHelloRoutes({
      effect: (fn: () => () => void) => { fn() },
      get: (name: string) => name === 'webServer'
        ? {
          register: (route: { handler: (req: never, res: never) => void }) => {
            handlers.push(route.handler)
            return () => {}
          },
        }
        : undefined,
    })
    const probe = res()
    handlers[0]!(req(), probe as never)
    expect(probe.status).toBe(200)
  })

  it('soft-gets webServer when property access throws without inject', () => {
    const registered: string[] = []
    const ctx = {
      effect: (fn: () => () => void) => { fn() },
      get webServer(): never {
        throw new Error('cannot get property "webServer" without inject')
      },
      get(name: string) {
        if (name !== 'webServer') return undefined
        return {
          register: (route: { path: string }) => {
            registered.push(route.path)
            return () => {}
          },
        }
      },
    }
    registerHelloRoutes(ctx)
    expect(registered).toEqual([STATUS_PATH])
  })
})
