/**
 * Extracted from @formatjs/intl because their ESM building is broken and we
 * cannot reliably use this (`getFormatter`) function.
 *
 * @license MIT
 *   https://github.com/formatjs/formatjs/blob/fbc878f973a997c5cba330e1e72bf5219e3f1a67/packages/intl/LICENSE.md
 */

import type { NumberFormatOptions } from '@formatjs/ecma402-abstract'
import {
  type CustomFormats,
  filterProps,
  type Formatters,
  getNamedFormat,
  type IntlFormatters,
  type OnErrorFn,
} from '@formatjs/intl'

const NUMBER_FORMAT_OPTIONS: Array<keyof NumberFormatOptions> = [
  'style',
  'currency',
  'currencyDisplay',
  'unit',
  'unitDisplay',
  'useGrouping',

  'minimumIntegerDigits',
  'minimumFractionDigits',
  'maximumFractionDigits',
  'minimumSignificantDigits',
  'maximumSignificantDigits',

  // ES2020 NumberFormat
  'compactDisplay',
  'currencyDisplay',
  'currencySign',
  'notation',
  'signDisplay',
  'unit',
  'unitDisplay',
  'numberingSystem',
]

export function getFormatter(
  {
    locale,
    formats,
    onError,
  }: {
    locale: string

    formats: CustomFormats
    onError: OnErrorFn
  },
  getNumberFormat: Formatters['getNumberFormat'],
  options: Parameters<IntlFormatters['formatNumber']>[1] = {},
): Intl.NumberFormat {
  const { format } = options

  const defaults = ((format &&
    getNamedFormat(formats!, 'number', format, onError)) ||
    {}) as NumberFormatOptions

  const filteredOptions = filterProps(
    options,
    NUMBER_FORMAT_OPTIONS,
    defaults,
  ) as NumberFormatOptions

  return getNumberFormat(locale, filteredOptions)
}
