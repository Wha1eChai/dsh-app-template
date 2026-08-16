import { STATUS_PATH } from '../http.js'

export interface HostStatus {
  readonly ok: boolean
  readonly status?: string
  readonly appId?: string
}

export async function fetchHostStatus(fetchImpl: typeof fetch = fetch): Promise<HostStatus | undefined> {
  try {
    const response = await fetchImpl(STATUS_PATH)
    if (!response.ok) return undefined
    return await response.json() as HostStatus
  } catch {
    return undefined
  }
}
