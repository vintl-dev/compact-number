# @vintl/compact-number

> Pluralisable compact notation numbers using `@formatjs/intl`.

[![Supports: ESM only](https://img.shields.io/static/v1?label=Format&message=ESM%20only&color=blue&style=flat-square)](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) [![Depends on @formatjs/intl](https://img.shields.io/static/v1?label=Requires&message=%40formatjs%2Fintl&color=lightgray&style=flat-square)](https://npm.im/@formatjs/intl)

## **Prehistory**

There has been a long-standing issue with the `Intl.NumberFormat` API that it does not provide any means to use a formatted number to choose the correct plural form. In contrast, this is possible in Java implementation of ICU4J. Unfortunately, this issue has not seen much progress for a long time, so something had to be done.

### **Issue**

Many people mistakenly assume that they can simply take the original number and pluralise it. However, this is not correct in languages with complex pluralisation rules, as the declension of the following noun depends on the compact unit rather than the number.

For example, in Ukrainian:

If you have 1,452 cats, you may want to display it in compact notation (e.g. 1.4K in English). Using `Intl.NumberFormat`, you get 1,4 тис. If you then pluralise it using the original number (1,452), you get ‘1,4 тис. коти’, which is incorrect. The correct result should be ‘1,4 тис. котів’.

This is because you are pluralising the wrong thing — the original number, without compact notation. The correct pluralisation for ‘1,452 коти’ is ‘1,452 котів’, but when you use compact notation, you need to select a plural form based on the unit (thousands in this case).

### **Mitigation**

This module attempts to address this issue by doing ‘smart rounding’. Using CLDR data, it calculates the exponent, the same one that is used to format the number, and then rounds the original number using it. The result is a number that roughly represents the rounded number. Using this number for pluralisation seems to work with most languages (however, additional testing from native speakers would be appreciated).

## **Installation**

With your package manager of choice:

**npm**

```sh
npm i @vintl/compact-number
```

**pnpm**

```sh
pnpm add @vintl/compact-number
```

**yarn**

```sh
yarn add @vintl/compact-number
```

## **Example**

```jsx
import { createFormatter } from '@vintl/compact-number'
import { createIntl } from '@formatjs/intl'
import '@vintl/compact-number/locale-data/en'

const intl = createIntl({ locale: 'en-US' })

const formatCompactNumber = createFormatter(intl)

const compactNumber = formatCompactNumber(1_456)

console.log(String(compactNumber))
// => "1.4K"

console.log(Number(compactNumber))
// => 1400
```

## **API**

### **`createFormatter`**

A function that accepts an `IntlShape` object as an argument and returns a function that can be used to create the `CompactNumber` objects.

```ts
const formatCompactNumber = createFormatter(intl)
```

### **`normalize`**

A function that accepts a `string`, a `CompactNumber` object, an element of `T` type, or an array of those. It then converts all `CompactNumber` objects in the provided value to strings.

If the provided value is an array and contains elements that are either strings or `CompactNumber` objects, the strings are joined together into a single string.

Likewise, when only a `CompactNumber` is given, the return value is equivalent to `String(value)`.

This function can be useful for filtering out invalid objects in React projects.

```ts
normalize([formatCompactNumber(1_350), { value: 'Hello' }])
// => ['1.3K', { value: 'Hello' }]

normalize([formatCompactNumber(1_350), ' cats'])
// => '1.3K cats'
```

### **`wrapFormatMessage`**

A function that accepts an `IntlShape` object as an argument and returns a wrapping function over the `formatMessage` method of the given `IntlShape` object. This wrapper calls the original `formatMessage` method and then normalizes all output using `normalize`.

```ts
const formatMessage = wrapFormatMessage(intl)
formatMessage(messages.greeting, {
  letters: formatCompactNumber(12_522),
})
// => 'Hello! You have 12.5K unread mail.'
```

### **`supportedLocalesOf`**

Accepts a locale or an array of BCP 47 language tags and returns an array of language tags that are supported for generating a pluralisable rounded number.

```ts
if (supportedLocalesOf(['en-US']).length < 1) {
  console.log('Missing locale data for English')
}
```

### **`addLocaleData`**

A function that accepts BCP 47 language tag and locale data object to store for use.

```ts
import data from '@vintl/compact-number/locale-data/en.data'
addLocaleData('en', enData)
supportedLocalesOf(['en-US'])
// => ['en']
```

### **`CompactNumber`**

Describes an object that holds the original number value as well as formatting options. This object has `toString`, `valueOf` and `toParts` methods that can be used to convert this object into a useful value.

Converting this object to a string (using `toString` or `String()`) will invoke number formatter and return the formatted string.

Converting it to a number (using `valueOf` or `Number()`) will invoke calculation of pluralisable number.

Calling `toParts` method will invoke the number formatter and return the formatted parts.

Return values of all methods are cached for a lifetime of the `CompactNumber` object.

## **Locale data**

In order to accurately round the numbers, CLDR locale data is required.

This module is built with of a subset of locale data provided by the `cldr-numbers-modern` module.

You can auto-add this data using `@vintl/compact-number/locale-data/[tag]`.
