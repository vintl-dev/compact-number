import * as fs from 'node:fs'
import * as path from 'node:path'
import { readJSONSync, outputFileSync } from 'fs-extra'

function assert(
  condition: boolean,
  message = 'Invariant',
  ...values: any[]
): asserts condition {
  if (!condition) {
    let compiledMessage = message
    for (let i = 0, l = values.length; i < l; i++) {
      compiledMessage = compiledMessage.replace(`{${i}}`, values[i])
    }

    throw new Error(compiledMessage)
  }
}

type TypeSelector = {
  /** Type of the number. */
  type: string
  /** Identifier of the node for that type. */
  nodeId: string
  /** Identifiers of the nodes containing format maps (e.g. short or long). */
  styleNodeIds: string[]
  /** Identifier of the node containing formats map. */
  formatNodeId: string
}

/** The formats that we are interested in extracting. */
const formatNodesNames: TypeSelector[] = [
  {
    type: 'decimal',
    nodeId: 'decimalFormats',
    formatNodeId: 'decimalFormat',
    styleNodeIds: ['long', 'short'],
  },
  {
    type: 'currency',
    nodeId: 'currencyFormats',
    formatNodeId: 'standard',
    styleNodeIds: ['short'],
  },
]

function getAttrValue(attrs: string[], attr: string): string | undefined {
  for (let i = 0, l = attrs.length; i < l; i += 2) {
    if (attrs[i] === attr) return attrs[i + 1]
  }
}

function processFormatsNode(formatsNode: any, selector: TypeSelector) {
  const styles = Object.create(null)

  for (const styleNodeId of selector.styleNodeIds) {
    const styleNode = formatsNode[styleNodeId]

    if (styleNode == null) continue

    const formatNode = styleNode[selector.formatNodeId]

    assert(
      formatNode != null,
      'Formats node "{0}" is missing format nodes root "{1}" in styles node "{2}"',
      selector.nodeId,
      selector.formatNodeId,
      styleNodeId,
    )

    const plurals = Object.create(null)

    for (const [encodedNodeName, format] of Object.entries(formatNode)) {
      const [formatNodeId, ...attrs] = encodedNodeName.split('-')

      const count = getAttrValue(attrs, 'count')

      if (count == null) continue

      assert(
        count != null,
        'Format node "{0}" is missing "count" attribute in styles node "{1}" of formats node "{2}"',
        formatNodeId,
        styleNodeId,
        selector.nodeId,
      )
      //
      ;(plurals[formatNodeId] ??= Object.create(null))[count] ??= format
    }

    styles[styleNodeId] = plurals
  }

  return styles
}

function extractFormats(
  numbersNode: any,
  locale: string,
): Record<string, Record<string, any>> {
  const formats: Record<string, any> = Object.create(null)

  for (const [encodedNodeName, nodeValue] of Object.entries(numbersNode)) {
    const [id, ...attrs] = encodedNodeName.split('-')

    const selector = formatNodesNames.find((sel) => sel.nodeId === id)

    if (selector == null) continue

    const numeralSystem = getAttrValue(attrs, 'numberSystem')

    assert(numeralSystem != null, '"{0}" is missing numberSystem attribute')

    formats[selector.type] ??= Object.create(null)

    try {
      formats[selector.type][numeralSystem] = processFormatsNode(
        nodeValue,
        selector,
      )
    } catch (err) {
      try {
        assert(
          false,
          'Cannot process node "{0}" (locale "{1}", numeral system "{2}"): {3}',
          id,
          locale,
          numeralSystem,
          (err as any).message,
        )
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(err)
      }
    }
  }

  return formats
}

function pushUnique<T>(arr: T[], value: T) {
  if (!arr.includes(value)) arr.push(value)
}

function generateDataFile(locale: string, cldrData: any) {
  const root = cldrData.main?.[locale]
  assert(root != null, 'root is null for locale "{0}"', locale)

  const numbers = root?.numbers
  assert(numbers != null, 'numbers is not null for locale "{0}"', locale)

  const numberFormats = extractFormats(numbers, locale)

  const allNumericSystems: string[] = []

  for (const formatType of Object.keys(numberFormats)) {
    const format = numberFormats[formatType]

    for (const numericSystem of Object.keys(format)) {
      pushUnique(allNumericSystems, numericSystem)
    }
  }

  const data = {
    numbers: {
      nu: allNumericSystems,
      ...numberFormats,
    },
    nu: allNumericSystems,
  }

  return `// prettier-ignore
export default (${JSON.stringify(data, null, 2)})`
}

function generateESMExporter(locale: string) {
  return `// prettier-ignore
import data from ${JSON.stringify(`./${locale}.data.mjs`)};
import { addLocaleData } from '../index.mjs';
addLocaleData(${JSON.stringify(locale)}, data);`
}

const dataFileDTS = `declare const _default: Parameters<
  typeof import('../index')['addLocaleData']
>[1]
export default _default`

const exporterFileDTS = 'export {};'

type WrittenFile = [path: string, size: number]

export function generateLocaleData({
  outDir,
}: {
  outDir: string
}): WrittenFile[] {
  const localesDir = path.join(
    process.cwd(),
    'node_modules',
    'cldr-numbers-modern',
    'main',
  )

  const locales = fs.readdirSync(localesDir)

  const writtenFiles: WrittenFile[] = []

  function output(filePath: string | string[], content: string) {
    const dst = path.join(
      outDir,
      ...(Array.isArray(filePath) ? filePath : [filePath]),
    )

    outputFileSync(dst, content, { encoding: 'utf8' })

    writtenFiles.push([dst, fs.statSync(dst).size])
  }

  for (const locale of locales) {
    const numbers = readJSONSync(path.join(localesDir, locale, 'numbers.json'))

    output(`${locale}.data.mjs`, generateDataFile(locale, numbers))
    output(`${locale}.data.d.ts`, dataFileDTS)

    output(`${locale}.mjs`, generateESMExporter(locale))
    output(`${locale}.d.ts`, exporterFileDTS)
  }

  return writtenFiles
}
