import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [{
    name: 'stub-plain-css',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('.css') && !source.includes('.module.css')) return '\0stub-plain-css'
    },
    load(id) {
      if (id === '\0stub-plain-css') return 'export default {}'
    },
  }],
  test: {
    server: {
      deps: {
        inline: ['@deepseek-ai/dsh-client-ui-primitives', 'katex', '@dshapps/webpage/ui'],
      },
    },
    include: ['tests/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage/unit',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        perFile: false,
        lines: 98,
        functions: 96,
        statements: 98,
        branches: 85,
      },
    },
  },
})
