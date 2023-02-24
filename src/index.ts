import {
  type IntlShape,
  MissingDataError,
  type MessageDescriptor,
} from '@formatjs/intl'
import type {
  FormatXMLElementFn,
  PrimitiveType,
  Options as IntlMessageFormatOptions,
} from 'intl-messageformat'
import {
  type CompactNumber,
  formatCompactNumber,
  isCompactNumber,
} from './compactNumber.js'
import { supportedLocalesOf } from './localeData.js'

type FormatCompactNumberParameters = typeof formatCompactNumber extends (
  arg1: any,
  arg2: any,
  ...args: infer P
) => any
  ? P
  : never

/**
 * Represents a formatting function that takes in a number to format, as well as
 * options that define how the number should be formatted.
 *
 * @param value Number to be formatted.
 * @param options Formatting options.
 * @returns Compact number object that can be converted to a string or a number.
 * @see {@link CompactNumber} For more details about the returned object.
 */
export type Formatter = (
  this: void,
  ...args: FormatCompactNumberParameters
) => CompactNumber

export function createFormatter<T>(intl: IntlShape<T>) {
  if (supportedLocalesOf(intl.locale).length < 1) {
    intl.onError(
      new MissingDataError(
        `Missing locale data for locale: "${intl.locale}" of compact number API.`,
      ),
    )
  }

  return formatCompactNumber.bind(
    undefined,
    intl.formatters.getNumberFormat,
    intl,
  ) as Formatter
}

interface Normalize {
  (
    this: void,
    output: string | CompactNumber | (string | CompactNumber)[],
  ): string
  <T>(
    this: void,
    output: string | T | CompactNumber | (T | CompactNumber | string)[],
  ): T | string | (T | string)[]
}

function normalizeImpl<T>(
  output: string | T | CompactNumber | (T | CompactNumber | string)[],
): T | string | (T | string)[] {
  if (Array.isArray(output)) {
    const normalized = output.map((chunk) =>
      isCompactNumber(chunk) ? String(chunk) : chunk,
    )

    if (normalized.every((item) => typeof item === 'string')) {
      return normalized.join('')
    }

    return normalized
  }

  return String(output)
}

export const normalize: Normalize = normalizeImpl

interface WrappedFormatMessage<TBase> {
  (
    this: void,
    descriptor: MessageDescriptor,
    values?: Record<
      string,
      CompactNumber | PrimitiveType | FormatXMLElementFn<string, string>
    >,
    opts?: IntlMessageFormatOptions,
  ): string

  <T extends TBase>(
    this: void,
    descriptor: MessageDescriptor,
    values?: Record<
      string,
      CompactNumber | PrimitiveType | T | FormatXMLElementFn<T>
    >,
    opts?: IntlMessageFormatOptions,
  ): T | string | (T | string)[]
}

/**
 * @param intl An {@link IntlShape} object which {@link IntlShape.formatMessage}
 *   method will be used to format the messages before normalization.
 * @returns A wrapper function over the original {@link IntlShape.formatMessage}
 *   of the provided {@link IntlShape}, which normalises the return value to
 *   remove all instances of {@link CompactNumber} from it.
 */
export function wrapFormatMessage<T>(intl: IntlShape<T>) {
  return function boundFormatMessage(descriptor: any, values: any, opts?: any) {
    return normalize(intl.formatMessage(descriptor, values, opts))
  } as WrappedFormatMessage<T>
}

export { addLocaleData, supportedLocalesOf } from './localeData.js'

export { type CompactNumber, isCompactNumber }
