import { registerHelloRoutes, type HelloHostContext } from './http.js'

/** Owner data passed to Hello App action contributions. */
export interface HelloAppOwner {
  readonly appPath: string
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'acme.hello.actions': {
      kind: 'list'
      scope: 'root'
      owner: HelloAppOwner
    }
  }
}

/** Host half: one allowlisted loopback GET route. Missing peers skip routes. Never throws. */
export function apply(ctx?: HelloHostContext): void {
  if (ctx === undefined) return
  try {
    if (typeof ctx.inject === 'function') {
      // One-shot ctx.get('webServer') races listen(); wait with inject instead.
      ctx.inject(['webServer'], inner => {
        registerHelloRoutes(inner)
      })
      return
    }
  } catch (error) {
    ctx.logger?.warn(`acme-hello: inject webServer failed: ${String(error)}`)
  }
  registerHelloRoutes(ctx)
}
