type RandomStringType = 'alphanumeric' | 'alphabetic' | 'numeric' | 'hex';

/**
 * Generates a random string based on the type and length you specify.
 * Useful for creating passwords or generating random hashes.
 *
 * @param {RandomStringType} type - The type of string to generate
 * @param {number} length - The length of the string to generate
 * @example
 * randomString('alphanumeric', 8);
 *
 * @returns {string} - The generated string
 */
export const randomString = (
  type: RandomStringType,
  length: number,
): string => {
  let result = '';
  const characters = {
    alphanumeric:
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    hex: '0123456789abcdef',
  };

  for (let i = 0; i < length; i++) {
    result += characters[type].charAt(
      Math.floor(Math.random() * characters[type].length),
    );
  }

  return result;
};

/**
 * Increments a string by appending a number to it or increasing the number.
 * Useful for creating “copies” or a file or duplicating database content which has unique titles or slugs.
 *
 * @param {string} str - The string to increment
 * @param {string} separator - The separator to use between the string and the number
 * @param {number} start - The number to start incrementing from
 * @example
 * incrementString('file', '-', 1);
 *
 * @returns {string} - The incremented string
 */
export const incrementString = (
  str: string,
  separator: string,
  start: number,
): string => {
  const matches = str.match(/(.*?)(\d+)$/);
  if (matches) {
    const base = matches[1];
    const number = parseInt(matches[2], 10);
    return base + separator + (number + 1);
  }
  return str + separator + start;
};

/**
 * Alternates between two strings based on a boolean.
 * Useful for toggling between two states or values.
 *
 * @param {boolean} bool - The boolean to use for alternating
 * @param {string} str1 - The first string to alternate
 * @param {string} str2 - The second string to alternate
 * @example
 * alternator(true, 'foo', 'bar');
 *
 * @returns {string} - The alternating string
 */
export const alternator = (
  bool: boolean,
  str1: string,
  str2: string,
): string => {
  return bool ? str1 : str2;
};

/**
 * Reduces multiple slashes in a string to a single slash.
 * Useful for normalizing paths and URLs.
 *
 * @param {string} str - The string to reduce slashes in
 * @example
 * reduceDoubleSlashes('foo//bar');
 *
 * @returns {string} - The string with reduced slashes
 */
export const reduceDoubleSlashes = (str: string): string => {
  return str.replace(/\/+/g, '/');
};

/**
 * Strips slashes from a string.
 * Useful for removing slashes from a string.
 *
 * @param {string} str - The string to strip slashes from
 * @example
 * stripSlashes('foo/bar');
 *
 * @returns {string} - The string with stripped slashes
 */
export const stripSlashes = (str: string): string => {
  return str.replace(/\//g, '');
};

/**
 * Reduces multiple occurrences of a character in a string to a single occurrence.
 * Useful for normalizing input and cleaning up user-generated content.
 *
 * @param {string} str - The string to reduce multiples in
 * @param {string} char - The character to reduce multiples of
 * @example
 * reduceMultiples('foo bar', ' ');
 *
 * @returns {string} - The string with reduced multiples
 */
export const reduceMultiples = (str: string, char: string): string => {
  return str.replace(new RegExp(`${char}+`, 'g'), char);
};

/**
 * Converts single and double quotes to HTML entities.
 * Useful for displaying user-generated content in a web page.
 *
 * @param {string} str - The string to convert quotes in
 * @example
 * quotesToEntities('foo "bar"');
 *
 * @returns {string} - The string with converted quotes
 */
export const quotesToEntities = (str: string): string => {
  return str.replace(/['"]/g, (m) => `&${m === '"' ? 'quot' : 'apos'};`);
};

/**
 * Strips single and double quotes from a string.
 * Useful for cleaning up user-generated content.
 *
 * @param {string} str - The string to strip quotes from
 * @example
 * stripQuotes('foo "bar"');
 *
 * @returns {string} - The string with stripped quotes
 */
export const stripQuotes = (str: string): string => {
  return str.replace(/['"]/g, '');
};

/**
 * Limits the number of words in a string.
 * Useful for creating excerpts or summaries of content.
 *
 * @param {string} str - The string to limit words in
 * @param {number} limit - The number of words to limit to
 * @param {string} append - The string to append if the limit is exceeded
 * @example
 * wordLimiter('foo bar baz', 2, '...');
 *
 * @returns {string} - The string with limited words
 */
export const wordLimiter = (
  str: string,
  limit: number,
  append: string,
): string => {
  return (
    str.split(' ').slice(0, limit).join(' ') +
    (str.split(' ').length > limit ? append : '')
  );
};

/**
 * Truncates a string to the number of characters specified.
 * It maintains the integrity of words so the character count may be slightly more or less than what you specify.
 *
 * @param {string} str - The string to limit characters in
 * @param {number} limit - The number of characters to limit to
 * @param {string} append - The string to append if the limit is exceeded
 * @example
 * characterLimiter('foo bar baz', 6, '...');
 *
 * @returns {string} - The string with limited characters
 */
export const characterLimiter = (
  str: string,
  limit: number,
  append: string,
): string => {
  return str.slice(0, limit) + (str.length > limit ? append : '');
};

/**
 * Converts ASCII characters to HTML entities.
 * Useful for displaying user-generated content in a web page.
 *
 * @param {string} str - The string to convert ASCII characters in
 * @example
 * asciiToEntities('foo bar');
 *
 * @returns {string} - The string with converted ASCII characters
 */
export const asciiToEntities = (str: string): string => {
  return str.replace(/[\x00-\x7F]/g, (m) => `&#${m.charCodeAt(0)};`);
};

/**
 * Converts HTML entities to ASCII characters.
 * Useful for cleaning up user-generated content.
 *
 * @param {string} str - The string to convert HTML entities in
 * @example
 * entitiesToAscii('foo bar');
 *
 * @returns {string} - The string with converted HTML entities
 */
export const entitiesToAscii = (str: string): string => {
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
};

/**
 * Converts accented characters to their ASCII equivalents.
 * Useful for cleaning up user-generated content.
 *
 * @param {string} str - The string to convert accented characters in
 * @example
 * convertAccentedCharacters('foo bar');
 *
 * @returns {string} - The string with converted accented characters
 */
export const convertAccentedCharacters = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Censors words in a string by replacing them with asterisks.
 * Useful for censoring profanity or other inappropriate content.
 *
 * @param {string} str - The string to censor words in
 * @param {string[]} words - The words to censor
 * @example
 * wordCensor('foo bar baz', ['bar']);
 *
 * @returns {string} - The string with censored words
 */
export const wordCensor = (str: string, words: string[]): string => {
  return str.replace(new RegExp(words.join('|'), 'gi'), (m) =>
    '*'.repeat(m.length),
  );
};

/**
 * Highlights code in a string by wrapping it in a code tag.
 * Useful for displaying code in a web page.
 *
 * @param {string} str - The string to highlight code in
 * @example
 * highlightCode('foo bar');
 *
 * @returns {string} - The string with highlighted code
 */
export const highlightCode = (str: string): string => {
  return `<code>${str}</code>`;
};

/**
 * Will highlight a phrase within a text string.
 * The first parameter will contain the original string, the second will contain the phrase you wish to highlight.
 * The third and fourth parameters will contain the opening/closing HTML tags you would like the phrase wrapped in.
 *
 * @param {string} str - The string to highlight the phrase in
 * @param {string} phrase - The phrase to highlight
 * @param {string} tagOpen - The opening HTML tag
 * @param {string} tagClose - The closing HTML tag
 * @example
 * highlightPhrase('foo bar baz', 'bar', '<strong>', '</strong>');
 *
 * @returns {string} - The string with highlighted phrase
 */
export const highlightPhrase = (
  str: string,
  phrase: string,
  tagOpen: string,
  tagClose: string,
): string => {
  return str.replace(new RegExp(phrase, 'gi'), (m) => tagOpen + m + tagClose);
};

/**
 * Wraps a string of words at a given number of characters.
 * Useful for creating excerpts or summaries of content.
 *
 * @param {string} str - The string to wrap words in
 * @param {number} limit - The number of characters to wrap at
 * @param {string} breakChar - The character to use for breaking
 * @example
 * wordWrap('foo bar baz', 6, ' ');
 *
 * @returns {string} - The string with wrapped words
 */
export const wordWrap = (
  str: string,
  limit: number,
  breakChar: string,
): string => {
  return str.replace(
    new RegExp(`(?![^\\n]{1,${limit}}$)([^\\n]{1,${limit}})\\s`, 'g'),
    `$1${breakChar}`,
  );
};

/**
 * Truncates a string to a specified length and appends an ellipsis to the end.
 * Useful for creating excerpts or summaries of content.
 *
 * @param {string} str - The string to truncate
 * @param {number} limit - The number of characters to truncate to
 * @example
 * ellipsize('foo bar baz', 6);
 *
 * @returns {string} - The truncated string
 */
export const ellipsize = (str: string, limit: number): string => {
  return str.length > limit ? str.slice(0, limit) + '...' : str;
};

/**
 * This function will extract $radius number of characters before and after the central `phrase` with an ellipsis before and after.
 *
 * @param {string} str - The string to extract the excerpt from
 * @param {string} phrase - The phrase to extract the excerpt around
 * @param {number} radius - The number of characters to extract around the phrase
 * @param {string} ellipsis - The ellipsis to use in the excerpt
 * @example
 * excerpt('foo bar baz', 'bar', 3, '...');
 *
 * @returns {string} - The excerpted string
 */
export const excerpt = (
  str: string,
  phrase: string,
  radius: number,
  ellipsis: string,
): string => {
  const re = new RegExp(`(.{0,${radius}}${phrase}.{0,${radius}})`, 'gi');
  const match = str.match(re);
  return match ? ellipsis + match[0] + ellipsis : str;
};

/**
 * This function will extract $radius number of words before and after the central `phrase` with an ellipsis before and after.
 *
 * @param {string} str - The string to extract the excerpt from
 * @param {string} phrase - The phrase to extract the excerpt around
 * @param {number} radius - The number of words to extract around the phrase
 * @param {string} ellipsis - The ellipsis to use in the excerpt
 * @example
 * excerptWords('foo bar baz', 'bar', 3, '...');
 *
 * @returns {string} - The excerpted string
 */
export const excerptWords = (
  str: string,
  phrase: string,
  radius: number,
  ellipsis: string,
): string => {
  const re = new RegExp(
    `((?:\\w+\\W+){0,${radius}}${phrase}(?:\\W+\\w+){0,${radius}})`,
    'gi',
  );
  const match = str.match(re);
  return match ? ellipsis + match[0] + ellipsis : str;
};
