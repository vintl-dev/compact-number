import * as fs from 'node:fs/promises'
import * as path from 'pathe'
import { defineBuildConfig } from 'unbuild'
import chalk from 'chalk'
import { generateLocaleData } from './build/localeData'

async function fileExists(fp: string) {
  try {
    await fs.stat(fp)
    return true
  } catch {
    return false
  }
}

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
    async 'rollup:done'(ctx) {
      const isCI = process.env.ci || process.env.test
      // eslint-disable-next-line no-console
      console.info(
        `${isCI ? '[task]' : chalk.yellow('↯')} Generating locale data`,
      )

      const outDir = path.join(ctx.options.outDir, 'locale-data')

      const writtenFiles = generateLocaleData({ outDir })

      ctx.buildEntries.push({
        path: path.relative(ctx.options.outDir, outDir),
        bytes: writtenFiles.reduce((total, emit) => total + emit[1], 0),
      })

      // fix incorrect .d.ts extension for .mjs files
      for (const entry of ctx.buildEntries) {
        if (path.extname(entry.path) !== '.mjs') continue

        const dtsPath = path.resolve(
          ctx.options.outDir,
          entry.path.replace(/\.mjs$/, '.d.ts'),
        )

        if (!(await fileExists(dtsPath))) continue

        const mdtsPath = dtsPath.replace(/\.d\.ts$/, '.d.mts')

        await fs.rename(dtsPath, mdtsPath)
      }
    },
  },
})
