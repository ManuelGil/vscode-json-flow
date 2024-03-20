/**
 * Changes a string of words separated by spaces or underscores to camel case.
 *
 * @param {string} str - The string to camelize
 * @example
 * camelize('foo bar');
 *
 * @returns {string} - The camelized string
 */
export const camelize = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase(),
    )
    .replace(/\s+/g, '');
};

/**
 * Changes a string of words separated by spaces or underscores to pascal case.
 *
 * @param {string} str - The string to pascalize
 * @example
 * pascalize('foo bar');
 *
 * @returns {string} - The pascalized string
 */
export const pascalize = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, '');
};

/**
 * Changes a string of words separated by spaces or camel or pascal case.
 *
 * @param {string} str - The string to underscore
 * @example
 * underscore('foo bar');
 *
 * @returns {string} - The underscored string
 */
export const underscore = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : `_${word.toLowerCase()}`,
    )
    .replace(/\s+/g, '_');
};

/**
 * Changes a string of words separated by spaces or camel or pascal case to lowercase with underscores.
 *
 * @param {string} str - The string to decamelize
 * @example
 * decamelize('foo bar');
 *
 * @returns {string} - The decamelized string
 */
export const decamelize = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : `_${word.toLowerCase()}`,
    )
    .replace(/\s+/g, '_');
};

/**
 * Changes a string of words separated by spaces or camel or pascal case to human readable form.
 *
 * @param {string} str - The string to humanize
 * @example
 * humanize('foo bar');
 *
 * @returns {string} - The humanized string
 */
export const humanize = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toUpperCase() : ` ${word.toLowerCase()}`,
    )
    .replace(/\s+/g, ' ');
};

/**
 * Checks if a string is pluralizable.
 *
 * @param {string} str - The string to check
 * @example
 * isPluralizable('foo');
 *
 * @returns {boolean} - Whether the string is pluralizable
 */
export const isPluralizable = (str: string): boolean => {
  return str.endsWith('s');
};

/**
 * Changes a string of words separated by spaces or camel or pascal case to lowercase with dashes.
 *
 * @param {string} str - The string to dasherize
 * @example
 * dasherize('foo bar');
 *
 * @returns {string} - The dasherized string
 */
export const dasherize = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : `-${word.toLowerCase()}`,
    )
    .replace(/\s+/g, '-');
};

/**
 * Changes a number to its ordinal form.
 *
 * @param {number} num - The number to ordinalize
 * @example
 * ordinalize(1);
 *
 * @returns {string} - The ordinalized number
 */
export const ordinal = (num: number): string => {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) {
    return `${num}st`;
  }
  if (j === 2 && k !== 12) {
    return `${num}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${num}rd`;
  }
  return `${num}th`;
};

/**
 * Changes a number to its ordinal form.
 *
 * @param {number} num - The number to ordinalize
 * @example
 * ordinalize(1);
 *
 * @returns {string} - The ordinalized number
 */
export const ordinalize = (num: number): string => {
  return `${num}${ordinal(num)}`;
};

/**
 * Changes a string to its plural form.
 *
 * @param {string} str - The string to pluralize
 * @example
 * pluralize('foo');
 *
 * @returns {string} - The pluralized string
 */
export const pluralize = (str: string): string => {
  if (str.endsWith('y')) {
    return str.slice(0, -1) + 'ies';
  }
  if (str.endsWith('s')) {
    return str;
  }
  return str + 's';
};

/**
 * Changes a string to its singular form.
 *
 * @param {string} str - The string to singularize
 * @example
 * singularize('foos');
 *
 * @returns {string} - The singularized string
 */
export const singularize = (str: string): string => {
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  }
  if (str.endsWith('s')) {
    return str.slice(0, -1);
  }
  return str;
};

/**
 * Changes a string to its title case form.
 *
 * @param {string} str - The string to titleize
 * @example
 * titleize('foo bar');
 *
 * @returns {string} - The titleized string
 */
export const titleize = (str: string): string => {
  return str
    .split(' ')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
};
