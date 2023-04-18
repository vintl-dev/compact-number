import {
  ComputeExponent,
  FormatNumericToString,
  type NumberFormatOptions,
  type NumberFormatInternal,
} from '@formatjs/ecma402-abstract'
import {
  MissingDataError,
  type FormatNumberOptions,
  type Formatters,
  type ResolvedIntlConfig,
} from '@formatjs/intl'
import { FormatError, ErrorCode } from 'intl-messageformat'
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
    throw new MissingDataError(
      `Missing locale data for locale "${opts.locale}"`,
    )
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
  } catch {
    onError?.(
      new FormatError(
        'Error creating formatter for the compact number.',
        ErrorCode.MISSING_INTL_API,
      ),
    )

    nf = undefined
  }

  const ensureFormatter = () => {
    if (nf == null) {
      throw new FormatError(
        'Formatter is not initialized',
        ErrorCode.MISSING_INTL_API,
      )
    }

    return nf
  }

  let roundedValue: number | undefined
  let formattedValue: string | undefined
  let parts: Intl.NumberFormatPart[] | undefined

  return {
    [CompactNumberSym]: true,

    valueOf(): number {
      if (roundedValue == null) {
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
      }

      return roundedValue
    },

    toString() {
      if (formattedValue == null) {
        formattedValue = ensureFormatter().format(value)
      }

      return formattedValue
    },

    toParts() {
      if (parts == null) {
        parts = ensureFormatter().formatToParts(value)
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
