import type { IncomingMessage, ServerResponse } from 'node:http'

export const STATUS_PATH = '/api/acme-hello/status'

export const HELLO_ROUTES = [STATUS_PATH] as const

export interface WebServerFace {
  register(route: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void
}

export interface HelloHostContext {
  effect?(fn: () => () => void, label?: string): void
  inject?(deps: readonly string[], callback: (ctx: HelloHostContext) => void): void
  get?(name: string): unknown
  logger?: { warn(message: string): void }
}

function isWebServer(value: unknown): value is WebServerFace {
  return value !== null && typeof value === 'object' && typeof (value as WebServerFace).register === 'function'
}

/** Cordis property access throws without inject — soft-get is the only safe read. */
function webServerOf(ctx: HelloHostContext): WebServerFace | undefined {
  try {
    const value = ctx.get?.('webServer')
    return isWebServer(value) ? value : undefined
  } catch {
    return undefined
  }
}

export function json(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
  })
  res.end(body)
}

export function isLoopbackAddress(address: string | undefined): boolean {
  if (typeof address !== 'string') return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  const ipv4 = normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized
  const octets = ipv4.split('.')
  return octets.length === 4 && octets[0] === '127' && octets.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

export function hostNameOf(value: string | undefined): string | null {
  if (typeof value !== 'string') return null
  const host = value.trim().toLowerCase()
  if (host.startsWith('[')) {
    const close = host.indexOf(']')
    if (close <= 1) return null
    const suffix = host.slice(close + 1)
    if (suffix !== '' && !/^:\d+$/.test(suffix)) return null
    return host.slice(1, close)
  }
  const firstColon = host.indexOf(':')
  const lastColon = host.lastIndexOf(':')
  if (firstColon !== lastColon) return host
  if (lastColon === -1) return host.replace(/\.$/, '')
  if (!/^\d+$/.test(host.slice(lastColon + 1))) return null
  return host.slice(0, lastColon).replace(/\.$/, '')
}

function isLoopbackHostHeader(req: IncomingMessage): boolean {
  const name = hostNameOf(typeof req.headers.host === 'string' ? req.headers.host : undefined)
  return name === 'localhost' || isLoopbackAddress(name ?? undefined)
}

/** Refuse non-GET and non-loopback callers before any work. */
export function rejectForeignCaller(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET') {
    json(res, 405, { ok: false, error: 'method-not-allowed' })
    return true
  }
  if (isLoopbackAddress(req.socket?.remoteAddress) && isLoopbackHostHeader(req)) return false
  json(res, 403, { ok: false, error: 'forbidden' })
  return true
}

export function handleStatus(req: IncomingMessage, res: ServerResponse): void {
  if (rejectForeignCaller(req, res)) return
  json(res, 200, { ok: true, status: 'ready', appId: 'acme.hello' })
}

const HANDLERS: Record<string, (req: IncomingMessage, res: ServerResponse) => void> = {
  [STATUS_PATH]: handleStatus,
}

function track(ctx: HelloHostContext, label: string, register: () => () => void): void {
  const run = (): (() => void) => {
    try {
      return register()
    } catch (error) {
      ctx.logger?.warn(`acme-hello: ${label} failed: ${String(error)}`)
      return () => {}
    }
  }
  if (typeof ctx.effect === 'function') ctx.effect(run, label)
  else run()
}

/** Register the allowlisted loopback route. Missing webServer is a no-op. Never throws. */
export function registerHelloRoutes(ctx: HelloHostContext): void {
  try {
    const webServer = webServerOf(ctx)
    if (webServer === undefined) return
    for (const path of HELLO_ROUTES) {
      const handler = HANDLERS[path]!
      track(ctx, path, () => webServer.register({
        kind: 'exact',
        path,
        handler: (req, res) => { handler(req, res) },
      }))
    }
  } catch (error) {
    ctx.logger?.warn(`acme-hello: register failed: ${String(error)}`)
  }
}
