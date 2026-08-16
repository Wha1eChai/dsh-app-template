import { useEffect, useState, type ReactNode } from 'react'
import { StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { WebpageAppSlotProps } from '@dshapps/webpage/client'
import { AppFields, AppField, AppPage } from '@dshapps/webpage/ui'
import type { HelloAppOwner } from '../index.js'
import { fetchHostStatus, type HostStatus } from './status.js'
import styles from './HelloApp.module.css'

export type HelloAppProps =
  WebpageAppSlotProps
  & PropsRenderSlots<'acme.hello.actions'>
  & PropsLocale<'hello'>
  & {
    fetchStatus?: typeof fetchHostStatus
  }

function statusLabel(t: HelloAppProps['t'], value: HostStatus | undefined, loading: boolean): string {
  if (loading) return t('hostLoading')
  if (value?.ok === true && value.status === 'ready') return t('hostReady')
  if (value === undefined) return t('hostUnavailable')
  return t('hostError')
}

/** Render the template home route and probe the Host status route. */
export function HelloApp({ appPath, renderSlot, t, fetchStatus = fetchHostStatus }: HelloAppProps): ReactNode {
  const owner: HelloAppOwner = Object.freeze({ appPath })
  const actions = renderSlot('acme.hello.actions', owner)
  const [status, setStatus] = useState<HostStatus | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      const next = await fetchStatus()
      if (!active) return
      setStatus(next)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [fetchStatus])

  const dotState: StateDotState = loading ? 'ongoing' : status?.ok === true ? 'done' : 'error'

  return (
    <article data-route="/">
      <AppPage title={t('pageTitle')} description={t('pageDescription')} actions={actions} actionsLabel={t('actions')}>
        <section className={styles.statusPanel} data-testid="host-status">
          <p className={styles.statusLabel}>{t('hostStatus')}</p>
          <div className={styles.statusRow}>
            <StateDot state={dotState} />
            <p className={styles.statusValue}>{statusLabel(t, status, loading)}</p>
          </div>
        </section>
        <AppFields>
          <AppField field="app-id" label="App ID" value={status?.appId ?? 'acme.hello'} />
        </AppFields>
      </AppPage>
    </article>
  )
}
