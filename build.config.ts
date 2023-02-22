import * as path from 'node:path'
import { defineBuildConfig } from 'unbuild'
import chalk from 'chalk'
import { generateLocaleData } from './build/localeData'

export default defineBuildConfig({
  entries: [
    {
      input: './src/index',
      name: 'index',
      builder: 'rollup',
      declaration: true,
      outDir: './dist',
    },
  ],
  hooks: {
    'build:prepare'(ctx) {
      ctx.options.declaration = ctx.options.entries.some(
        (entry) => entry.declaration,
      )
    },
    'rollup:done'(ctx) {
      const isCI = process.env.ci || process.env.test
      // eslint-disable-next-line no-console
      console.info(
        `${isCI ? '[task]' : chalk.yellow('↯')} Generating locale data`,
      )

      const outDir = path.join(process.cwd(), 'dist', 'locale-data')

      const writtenFiles = generateLocaleData({ outDir })

      ctx.buildEntries.push({
        path: outDir,
        bytes: writtenFiles.reduce((total, emit) => total + emit[1], 0),
      })
    },
  },
})
