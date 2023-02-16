import { createIntl, createIntlCache, defineMessages } from '@formatjs/intl'
import { describe, expect, it, vi } from 'vitest'
import { createFormatter, wrapFormatMessage, type CompactNumber } from '../dist'

import '../dist/locale-data/en'
import '../dist/locale-data/uk'
import '../dist/locale-data/de'
import '../dist/locale-data/ar'
import '../dist/locale-data/ja'

function withAbnormalSpacesReplaced(value: string): string {
  return value.replace(/[\u202F\u00A0]/g, ' ')
}

describe('CompactNumber', () => {
  const tests = [
    ['en-US', '1.5K', 1500],
    ['uk', '1,5 тис.', 1500],
    ['de', '1456', 1456],
    ['ar', '١٫٥ ألف', 1500],
    ['ja', '1456', 1456],
  ] as const

  for (const [locale, expectedString, expectedNumber] of tests) {
    const intl = createIntl({ locale })

    const formatCompactNumber = createFormatter(intl)

    const compactNumber = formatCompactNumber(1456)

    it(`converts to string (${locale})`, () => {
      expect(withAbnormalSpacesReplaced(String(compactNumber))).toBe(
        expectedString,
      )
    })

    it(`converts to number (${locale})`, () => {
      expect(Number(compactNumber)).toBe(expectedNumber)
    })
  }

  // en is the first locale import, means it will be the default locale
  it('errors on unknown locale, but uses "en" as fallback', () => {
    const onError = vi.fn()
    const intl = createIntl({
      // we never added zh-Hans data, so this must error
      locale: 'zh-Hans',
      onError,
    })

    const formatCompactNumber = createFormatter(intl)

    const compactNumber = formatCompactNumber(14567)

    expect(String(compactNumber)).toBe('1.5万')
    expect(Number(compactNumber)).toBe(15000)
    expect(onError).toHaveBeenCalledOnce()
  })

  const messages = defineMessages({
    cats: {
      id: 'cats',
      defaultMessage: '{count, plural, one {{count} cat} other {{count} cats}}',
    },
  } as const)

  type MessagesMap = {
    [K in (typeof messages)[keyof typeof messages]['id']]: string
  }

  const cache = createIntlCache()

  it('formatMessage (compactNumber, uk)', () => {
    const ukMessages: MessagesMap = {
      cats:
        '{count, plural,' +
        ' one {{count} кіт}' +
        ' few {{count} коти}' +
        ' many {{count} котів}' +
        ' other {{count} кота}' +
        '}',
    }

    const intl = createIntl<CompactNumber>(
      {
        locale: 'uk',
        defaultLocale: 'en-US',
        messages: ukMessages,
      },
      cache,
    )

    const formatCompactNumber = createFormatter(intl)

    const formatMessage = wrapFormatMessage(intl)

    expect(
      withAbnormalSpacesReplaced(
        formatMessage(messages.cats, {
          count: formatCompactNumber(1_256, {
            maximumFractionDigits: 1,
          }),
        }),
      ),
    ).toBe('1,3 тис. котів')
  })

  it('formatMessage (compactNumber, ja)', () => {
    const jaMessages: MessagesMap = {
      cats: '{count, plural, other {{count}猫}}',
    }

    const intl = createIntl<CompactNumber>(
      {
        locale: 'ja',
        defaultLocale: 'en-US',
        messages: jaMessages,
      },
      cache,
    )

    const formatCompactNumber = createFormatter(intl)

    const formatMessage = wrapFormatMessage(intl)

    expect(
      withAbnormalSpacesReplaced(
        formatMessage(messages.cats, {
          count: formatCompactNumber(12_256),
        }),
      ),
    ).toBe('1.2万猫')
  })
})
