import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, relative, resolve as resolvePath, sep } from 'node:path'
import type { UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

/** Static browser module-table entries seeded by the DSH Web shell. */
export const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

/** Immediately loaded graph rows that may be required after Loader prefetch. */
export const GRAPH_MODULES = ['@deepseek-ai/dsh-client-runtime/client'] as const

/** Externals resolved from either the static seed or a registered graph row. */
export const CLIENT_EXTERNALS: readonly string[] = [...PLATFORM_MODULES, ...GRAPH_MODULES]

const INLINE_SAFE = /^@deepseek-ai\/dsh-(host-apiproxy|session|llm|tools|brand)(\/|$)/
const VENDORED_LIBRARY = /^@deepseek-ai\/(cosmokit|schemastery)(\/|$)/
const GENERATED_REMOTE = /^@deepseek-ai\/dsh-[a-z0-9]+(?:-[a-z0-9]+)*\/remote$/

const CSS_PREFIX = '\0acme-hello-app-css:'
const CSS_SUFFIX = '.mjs'
const REPOSITORY_ROOT = process.cwd()

function nodeConfig(id: string, entries: readonly string[]): UserConfig {
  return {
    name: id,
    entry: [...entries],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    fixedExtension: false,
    dts: false,
    clean: false,
  }
}

function resolveCssAsset(source: string, importer: string): string {
  const emitted = resolvePath(dirname(importer), source)
  if (existsSync(emitted)) return emitted
  const marker = `${sep}lib${sep}types${sep}`
  const index = emitted.indexOf(marker)
  if (index < 0) return emitted
  return resolvePath(emitted.slice(0, index), 'src', emitted.slice(index + marker.length))
}

function cssPlugin(id: string): NonNullable<UserConfig['plugins']>[number] {
  return {
    name: 'acme-hello-app-css-modules',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const asset = importer === undefined ? source : resolveCssAsset(source, importer)
      return CSS_PREFIX + asset + CSS_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_PREFIX)) return null
      const file = virtualId.slice(CSS_PREFIX.length, -CSS_SUFFIX.length)
      this.addWatchFile(file)
      const source = await readFile(file)
      const result = transform({
        filename: file,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classes: Record<string, string> = {}
      for (const [local, value] of Object.entries(result.exports ?? {})) classes[local] = value.name
      const tagId = `${id}/${basename(file)}`
      return [
        `const css = ${JSON.stringify(result.code.toString())};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        "if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=\"' + tagId + '\"]') === null) {",
        "  const tag = document.createElement('style');",
        `  tag.dataset.plugin = ${JSON.stringify(id)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classes)};`,
      ].join('\n')
    },
  }
}

function purityPlugin(): NonNullable<UserConfig['plugins']>[number] {
  return {
    name: 'dsh-client-bundle-purity',
    resolveId(source: string) {
      if (source === '@dshapps/webpage/ui') return null
      if (source === '@dshapps/webpage' || source.startsWith('@dshapps/webpage/')) {
        throw new Error(
          `client bundle purity: "${source}" must stay type-only except /ui; App navigation uses ctx.pages`,
        )
      }
      if (!source.startsWith('@deepseek-ai/')) return null
      if (CLIENT_EXTERNALS.includes(source)) return null
      if (VENDORED_LIBRARY.test(source) || INLINE_SAFE.test(source) || GENERATED_REMOTE.test(source)) return null
      throw new Error(
        `client bundle purity: "${source}" is not a Loader external or an inline-safe wire module; `
        + 'cross-plugin value imports must use Cordis services',
      )
    },
  }
}

function clientConfig(id: string, entry: string): UserConfig {
  return {
    name: `${id}/client`,
    entry: { client: entry },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: [...CLIENT_EXTERNALS],
      alwaysBundle: (source: string) => !CLIENT_EXTERNALS.includes(source),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    plugins: [purityPlugin(), cssPlugin(id)],
    outputOptions: {
      codeSplitting: false,
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      sourcemapPathTransform(source: string, mapPath: string) {
        if (!source.startsWith('.')) return source
        const physical = resolvePath(dirname(mapPath), source)
        return relative(REPOSITORY_ROOT, physical).split(sep).join('/')
      },
    },
  }
}

/** Build the ESM Node half and the Loader-compatible CJS client half. */
export function clientBundle(id: string, nodeEntries: readonly string[]): UserConfig[] {
  return [
    nodeConfig(id, nodeEntries),
    clientConfig(id, 'src/client/index.tsx'),
  ]
}
