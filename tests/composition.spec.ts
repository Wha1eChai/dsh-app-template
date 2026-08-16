import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply as applyHost } from '../src/index.js'
import { apply as applyInvariant, inject as invariantInject, name as invariantName } from '../src/invariant.js'
import { apply, inject, name, HelloAppBody } from '../src/client/index.js'
import { en, zh } from '../src/client/locales.js'

describe('Hello App composition', () => {
  afterEach(() => vi.restoreAllMocks())

  it('registers metadata, locale, and the lazy App body in one effect', () => {
    const unregisterPage = vi.fn()
    const unregisterLocale = vi.fn()
    const unregisterApp = vi.fn()
    const pageRegister = vi.fn(() => unregisterPage)
    const localeRegister = vi.fn(() => unregisterLocale)
    const slotRegister = vi.fn(() => unregisterApp)
    const slotInject = vi.fn((_name: string, callback: () => (() => void)) => callback())
    const cleanups: Array<() => void> = []
    const effect = vi.fn((execute: () => () => void) => {
      cleanups.push(execute())
    })

    apply({
      pages: { register: pageRegister },
      locale: { register: localeRegister },
      slots: { inject: slotInject, register: slotRegister },
      effect,
    } as never)

    expect(name).toBe('@acme/hello-app')
    expect(inject).toEqual(['pages', 'slots', 'locale'])
    expect(effect).toHaveBeenCalledOnce()
    expect(pageRegister).toHaveBeenCalledWith(expect.objectContaining({
      id: 'acme.hello',
      label: '你好 App',
      surface: 'panel',
    }))
    expect(localeRegister).toHaveBeenCalledWith('hello', { zh, en })
    expect(slotInject).toHaveBeenCalledWith('webpage.app', expect.any(Function))
    expect(slotRegister).toHaveBeenCalledWith({
      name: 'webpage.app',
      key: 'acme.hello',
      locale: 'hello',
      children: {
        'acme.hello.actions': { kind: 'list', scope: 'root' },
      },
    }, HelloAppBody)

    cleanups[0]!()
    expect(unregisterApp).toHaveBeenCalledOnce()
    expect(unregisterPage).toHaveBeenCalledOnce()
    expect(unregisterLocale).toHaveBeenCalledOnce()
  })

  it('keeps English keys identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('Hello App host and invariant entries', () => {
  it('registers Host routes when webServer is present and reserves package ownership', async () => {
    expect(applyHost).not.toThrow()
    const register = vi.fn(() => () => {})
    applyHost({
      effect: (fn: () => () => void) => { fn() },
      inject: (_deps, callback) => {
        callback({
          effect: (fn: () => () => void) => { fn() },
          get: (name: string) => name === 'webServer' ? { register } : undefined,
        })
      },
    })
    expect(register).toHaveBeenCalled()
    expect(invariantName).toBe('acme-hello-app-invariant')
    expect(invariantInject).toEqual(['invariants'])
    const invariantRegister = vi.fn(() => () => {})
    const disposer = await applyInvariant({ invariants: { register: invariantRegister } } as never)
    expect(invariantRegister).toHaveBeenCalledWith('@acme/hello-app', expect.any(Function))
    invariantRegister.mock.calls[0]![1]()
    disposer()
  })
})
