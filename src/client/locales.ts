/** Hello App product copy: Chinese is the default and English is complete. */
export const zh = Object.freeze({
  title: '你好 App',
  description: 'DSH Webpage App 官方入门模板。',
  pageTitle: '欢迎',
  pageDescription: '这是一个可克隆、可重命名、可发布的 App 骨架。',
  hostStatus: 'Host 状态',
  hostReady: '就绪',
  hostUnavailable: '不可用',
  hostLoading: '加载中…',
  hostError: '读取失败',
  actions: '扩展操作',
})

export const en = Object.freeze({
  title: 'Hello App',
  description: 'Official DSH Webpage App starter template.',
  pageTitle: 'Welcome',
  pageDescription: 'A cloneable, renameable, publishable App skeleton.',
  hostStatus: 'Host status',
  hostReady: 'Ready',
  hostUnavailable: 'Unavailable',
  hostLoading: 'Loading…',
  hostError: 'Read failed',
  actions: 'Extension actions',
})

export type HelloLocaleKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    hello: HelloLocaleKey
  }
}
