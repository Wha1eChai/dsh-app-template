import { lazy } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { AppDescriptor } from '@dshapps/webpage/client'

import { en, zh } from './locales.js'

/** App body is a lazy module so a throw or suspend stays inside Webpage's AppBoundary. */
export const HelloAppBody = lazy(async () => {
  const module = await import('./HelloApp.js')
  return { default: module.HelloApp }
})

const descriptor = Object.freeze({
  id: 'acme.hello',
  label: '你好 App',
  description: 'DSH Webpage App 官方入门模板。',
  order: 50,
  categories: ['template'],
  surface: 'panel',
}) satisfies AppDescriptor

const LOCALE_NAMESPACE = 'hello'
const APP_ID = 'acme.hello'

/** Stable Loader identity used for Cordis fiber provenance. */
export const name = '@acme/hello-app'

/** Client services required by the Hello App. Do not hard-export host peers here. */
export const inject = ['pages', 'slots', 'locale']

/** Register App metadata and the keyed Webpage body in one Cordis effect. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const unregisterLocale = ctx.locale.register(LOCALE_NAMESPACE, { zh, en })
    const unregisterPage = ctx.pages.register(descriptor)
    const unregisterApp = ctx.slots.inject('webpage.app', () => ctx.slots.register({
      name: 'webpage.app',
      key: APP_ID,
      locale: LOCALE_NAMESPACE,
      children: {
        'acme.hello.actions': { kind: 'list', scope: 'root' },
      },
    }, HelloAppBody))

    return () => {
      unregisterApp()
      unregisterPage()
      unregisterLocale()
    }
  }, 'acme-hello-app: composition')
}

export type { HelloAppProps } from './HelloApp.js'
