import {
  CanonicalizeLocaleList,
  SupportedLocales,
  type NumberFormatOptions,
} from '@formatjs/ecma402-abstract'
import { ResolveLocale } from '@formatjs/intl-localematcher'

interface NumberFormatLocaleData {
  nu: string[]
  numbers: {
    nu: string[]
    decimal: {
      [numericSystem: string]: {
        short: Record<string | number, string>
        long: Record<string | number, string>
      }
    }
    currency: {
      [numericSystem: string]: {
        short: Record<string | number, string>
        long: Record<string | number, string>
      }
    }
  }
}

const localeData: Record<string, NumberFormatLocaleData> = Object.create(null)

const availableLocales: Set<string> = new Set()

let defaultLocale: string | null = null

export function getDefaultLocale() {
  if (defaultLocale == null) {
    throw new Error('No compact number data has been loaded')
  }

  return defaultLocale
}

export function setDefaultLocaleDataLocale(value: string) {
  let apply = value

  if (!availableLocales.has(apply)) {
    apply = new Intl.Locale(apply).minimize().toString()

    if (apply === value) {
      throw new Error(
        `No compact number data has been loaded for locale "${value}"`,
      )
    }

    if (!availableLocales.has(apply)) {
      throw new Error(
        `No compact number data has been loaded for locale "${value}", nor its minimized variant "${apply}"`,
      )
    }
  }

  defaultLocale = apply
}

export function getLocaleData(
  localeCodes: string | string[],
  opts: NumberFormatOptions,
) {
  const requestedLocales = CanonicalizeLocaleList(localeCodes)

  const opt = Object.create(null)

  opt.localeMatcher = opts.localeMatcher ?? 'best fit'

  opt.nu = opts.numberingSystem

  const { dataLocale } = ResolveLocale(
    availableLocales,
    requestedLocales,
    opt,
    ['nu'],
    localeData,
    getDefaultLocale,
  )

  return localeData[dataLocale]
}

export function supportedLocalesOf(
  locales: string | string[],
  options?: Pick<NumberFormatOptions, 'localeMatcher'>,
) {
  return SupportedLocales(
    availableLocales,
    CanonicalizeLocaleList(locales),
    options,
  )
}

export function addLocaleData(locale: string, data: NumberFormatLocaleData) {
  const minimized = String(new Intl.Locale(locale).minimize())
  localeData[locale] = data
  localeData[minimized] = data
  availableLocales.add(locale).add(minimized)
  if (defaultLocale == null) defaultLocale = minimized
}
