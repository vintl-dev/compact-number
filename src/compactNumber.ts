import {
  ComputeExponent,
  FormatNumericToString,
  type NumberFormatOptions,
  type NumberFormatInternal,
} from '@formatjs/ecma402-abstract'
import {
  type FormatNumberOptions,
  type Formatters,
  IntlError,
  IntlErrorCode,
  type ResolvedIntlConfig,
} from '@formatjs/intl'
import { getLocaleData } from './localeData.js'
import { getFormatter } from './number.js'

export type FormatCompactNumberOptions = Omit<FormatNumberOptions, 'notation'>

type Formatter = Formatters['getNumberFormat']

type Config = Pick<ResolvedIntlConfig, 'locale' | 'onError' | 'formats'>

const CompactNumberSym = Symbol('isCompactNumber')

/**
 * {@link CompactNumber} is a value object created for a number and with specific
 * formatting options, that can be converted to string, in which case it will
 * return the formatted number in compact notation, or to a number in which case
 * it will return rounded number that can be used to select correct plural case,
 * matching the formatted number.
 *
 * This object implements both `valueOf` and `toString` methods, so it's
 * possible to pass it directly to {@link String} and {@link Number} functions to
 * get the desired values. It is lazy implementation, so values are computed
 * once they accessed and cached afterwards.
 *
 * To use this object {@link Intl.NumberFormat} must be polyfilled since it
 * requires CLDR data to function. It does not support {@link BigInt}.
 */
export interface CompactNumber {
  [CompactNumberSym]: true

  valueOf(): number
  toString(): string
  toParts(): Intl.NumberFormatPart[]
}

function toFakeInternalSlots(nf: Intl.NumberFormat): NumberFormatInternal {
  const opts = nf.resolvedOptions()

  const localeData = getLocaleData(
    nf.resolvedOptions().locale,
    opts as NumberFormatOptions,
  )

  if (localeData == null) {
    throw new Error(`Missing locale data for locale "${opts.locale}"`)
  }

  return {
    ...nf.resolvedOptions(),
    dataLocaleData: localeData as any,
  } as NumberFormatInternal
}

export function formatCompactNumber(
  getNumberFormat: Formatter,
  config: Config,
  value: number,
  options?: FormatCompactNumberOptions,
): CompactNumber {
  let nf: Intl.NumberFormat | undefined
  const { onError, locale, formats } = config

  try {
    nf = getFormatter({ locale, formats, onError }, getNumberFormat, {
      ...(options ?? {}),
      notation: 'compact',
    })
  } catch (e) {
    onError?.(
      new IntlError(
        IntlErrorCode.FORMAT_ERROR,
        'Error creating formatter for the compact number.',
        e,
      ),
    )

    nf = undefined
  }

  const reportError = (err: unknown) =>
    config.onError(
      new IntlError(
        IntlErrorCode.FORMAT_ERROR,
        'Error formatting the compact number',
        err,
      ),
    )

  const ensureFormatter = () => {
    if (nf == null) throw new Error('Formatter is not initialized')
    return nf
  }

  let roundedValue: number | undefined
  let formattedValue: string | undefined
  let parts: Intl.NumberFormatPart[] | undefined

  return {
    [CompactNumberSym]: true,

    valueOf(): number {
      if (roundedValue == null) {
        try {
          const nf = ensureFormatter()

          const internalSlots = toFakeInternalSlots(nf)

          const [exponent] = ComputeExponent(nf, value, {
            getInternalSlots() {
              return internalSlots
            },
          })

          const numeric =
            exponent < 0
              ? value * Math.pow(10, -exponent)
              : value / Math.pow(10, exponent)

          const { roundedNumber } = FormatNumericToString(
            nf.resolvedOptions() as NumberFormatInternal,
            numeric,
          )

          roundedValue = roundedNumber * Math.pow(10, exponent)
        } catch (err) {
          reportError(err)
          roundedValue = value
        }
      }

      return roundedValue
    },

    toString() {
      if (formattedValue == null) {
        try {
          formattedValue = ensureFormatter().format(value)
        } catch (err) {
          reportError(err)
          formattedValue = String(value)
        }
      }

      return formattedValue
    },

    toParts() {
      if (parts == null) {
        try {
          parts = ensureFormatter().formatToParts(value)
        } catch (err) {
          reportError(err)
          parts = [
            {
              type: 'literal',
              value: String(value),
            },
          ]
        }
      }

      return parts
    },
  }
}

export function isCompactNumber(value: unknown): value is CompactNumber {
  return (
    typeof value === 'object' &&
    value != null &&
    CompactNumberSym in value &&
    value[CompactNumberSym] === true
  )
}
