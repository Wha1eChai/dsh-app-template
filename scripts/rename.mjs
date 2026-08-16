#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLACEHOLDERS_PATH = join(ROOT, 'template.placeholders.json')

const SKIP_DIRS = new Set(['node_modules', 'lib', 'coverage', '.git'])
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.mjs', '.js', '.json', '.yml', '.yaml', '.md', '.css',
])

function usage(): never {
  console.error('Usage: node scripts/rename.mjs --scope <scope> --app <app>')
  console.error('Example: node scripts/rename.mjs --scope myorg --app myfeature')
  process.exit(1)
}

function parseArgs(argv) {
  let scope
  let app
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--scope') scope = argv[++index]
    else if (arg === '--app') app = argv[++index]
  }
  if (typeof scope !== 'string' || scope.length === 0) usage()
  if (typeof app !== 'string' || app.length === 0) usage()
  if (!/^[a-z][a-z0-9-]*$/.test(scope)) {
    console.error(`Invalid scope "${scope}". Use lower-case dotted segments without dots.`)
    process.exit(1)
  }
  if (!/^[a-z][a-z0-9-]*$/.test(app)) {
    console.error(`Invalid app "${app}". Use lower-case dotted segments without dots.`)
    process.exit(1)
  }
  return { scope, app }
}

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const path = join(dir, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) walkFiles(path, files)
    else files.push(path)
  }
  return files
}

function replacements(oldValues, scope, app) {
  const slug = `${scope}-${app}`
  return [
    [oldValues.childSlot, `${scope}.${app}.actions`],
    [oldValues.packageName, `@${scope}/${app}-app`],
    [oldValues.appId, `${scope}.${app}`],
    [oldValues.routePrefix, `/api/${slug}`],
    [oldValues.compositionEffect, `${slug}-app: composition`],
    [oldValues.invariantPrefix, `${slug}-app`],
    [oldValues.cssModulePlugin, `${slug}-app-css-modules`],
    [oldValues.cssVirtualPrefix, `${slug}-app-css:`],
    [oldValues.logPrefix, slug],
    [oldValues.patchId, `${app}-app`],
    [oldValues.localeNamespace, app],
  ].sort((left, right) => right[0].length - left[0].length)
}

function main() {
  const { scope, app } = parseArgs(process.argv.slice(2))
  const oldValues = JSON.parse(readFileSync(PLACEHOLDERS_PATH, 'utf8'))
  const pairs = replacements(oldValues, scope, app)
  const files = walkFiles(ROOT).filter((path) => {
    const ext = path.slice(path.lastIndexOf('.'))
    if (!TEXT_EXTENSIONS.has(ext)) return false
    if (path === PLACEHOLDERS_PATH) return false
    if (path.endsWith('scripts/rename.mjs')) return false
    return true
  })

  let changedFiles = 0
  for (const path of files) {
    let text = readFileSync(path, 'utf8')
    let changed = false
    for (const [from, to] of pairs) {
      if (text.includes(from)) {
        text = text.split(from).join(to)
        changed = true
      }
    }
    if (changed) {
      writeFileSync(path, text, 'utf8')
      changedFiles += 1
      console.log(relative(ROOT, path))
    }
  }

  const nextValues = {
    packageName: `@${scope}/${app}-app`,
    appId: `${scope}.${app}`,
    childSlot: `${scope}.${app}.actions`,
    localeNamespace: app,
    routePrefix: `/api/${scope}-${app}`,
    patchId: `${app}-app`,
    invariantPrefix: `${scope}-${app}-app`,
    compositionEffect: `${scope}-${app}-app: composition`,
    cssModulePlugin: `${scope}-${app}-app-css-modules`,
    cssVirtualPrefix: `${scope}-${app}-app-css:`,
    logPrefix: `${scope}-${app}`,
  }
  writeFileSync(PLACEHOLDERS_PATH, `${JSON.stringify(nextValues, null, 2)}\n`, 'utf8')
  console.log(`Updated ${changedFiles} file(s). Next rename starts from @${scope}/${app}-app / ${scope}.${app}.`)
}

main()
