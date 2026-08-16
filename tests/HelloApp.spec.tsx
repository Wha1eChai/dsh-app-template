// @vitest-environment jsdom

import { Suspense } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HelloAppBody } from '../src/client/index.js'
import { HelloApp, type HelloAppProps } from '../src/client/HelloApp.js'
import { en } from '../src/client/locales.js'
import type { HostStatus } from '../src/client/status.js'

function props(
  appPath = '/',
  renderSlot = vi.fn(() => null),
  fetchStatus = vi.fn(async (): Promise<HostStatus | undefined> => ({ ok: true, status: 'ready', appId: 'acme.hello' })),
): HelloAppProps {
  return {
    appId: 'acme.hello',
    appPath,
    search: '',
    hash: '',
    navigate: vi.fn(),
    close: vi.fn(),
    renderSlot: renderSlot as unknown as HelloAppProps['renderSlot'],
    t: key => en[key],
    fetchStatus,
  }
}

describe('HelloApp', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the home route and exposes the child actions slot', async () => {
    const renderSlot = vi.fn(() => <button type="button">Kind action</button>)
    render(<HelloApp {...props('/', renderSlot)} />)

    expect(screen.getByRole('article').getAttribute('data-route')).toBe('/')
    expect(screen.getByText('Welcome')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Close app' })).toBeNull()
    expect(renderSlot).toHaveBeenCalledWith('acme.hello.actions', { appPath: '/' })
    expect(screen.getByRole('button', { name: 'Kind action' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Extension actions' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Ready')).toBeTruthy())
    expect(document.querySelector('[data-field="app-id"]')?.textContent).toContain('acme.hello')
  })

  it('does not render the actions heading when the slot is empty', async () => {
    render(<HelloApp {...props('/')} />)
    expect(screen.queryByRole('heading', { name: 'Extension actions' })).toBeNull()
    await waitFor(() => expect(screen.getByText('Ready')).toBeTruthy())
  })

  it('shows unavailable when the Host status route fails', async () => {
    render(<HelloApp {...props('/', vi.fn(() => null), vi.fn(async () => undefined))} />)
    await waitFor(() => expect(screen.getByText('Unavailable')).toBeTruthy())
  })

  it('shows read failed when the Host returns a non-ready payload', async () => {
    render(<HelloApp {...props('/', vi.fn(() => null), vi.fn(async () => ({ ok: false, status: 'broken' })))} />)
    await waitFor(() => expect(screen.getByText('Read failed')).toBeTruthy())
  })

  it('lazy-loads the Hello body through the client entry', async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <HelloAppBody {...props('/')} />
      </Suspense>,
    )
    await waitFor(() => expect(screen.getByText('Welcome')).toBeTruthy())
  })
})

describe('fetchHostStatus', () => {
  it('returns parsed JSON on success and undefined on failure', async () => {
    const { fetchHostStatus } = await import('../src/client/status.js')
    const ok = await fetchHostStatus(async () => ({
      ok: true,
      json: async () => ({ ok: true, status: 'ready' }),
    } as never))
    expect(ok).toEqual({ ok: true, status: 'ready' })
    const bad = await fetchHostStatus(async () => ({
      ok: false,
      json: async () => ({}),
    } as never))
    expect(bad).toBeUndefined()
    const boom = await fetchHostStatus(async () => { throw new Error('network') })
    expect(boom).toBeUndefined()
  })
})
