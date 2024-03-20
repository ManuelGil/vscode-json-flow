/**
 * Formats numbers as bytes, based on size, and adds the appropriate suffix.
 *
 * @param {number} bytes - The number to format
 * @param {number} decimals - The number of decimal places to include
 * @example
 * numberToSize(1024);
 *
 * @returns {string} - The formatted number
 */
export const numberToSize = (bytes: number, decimals = 2): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Formats numbers as amounts, based on size, and adds the appropriate suffix.
 *
 * @param {number} amount - The number to format
 * @param {number} decimals - The number of decimal places to include
 * @example
 * numberToAmount(1024);
 *
 * @returns {string} - The formatted number
 */
export const numberToAmount = (amount: number, decimals = 2): string => {
  return amount.toFixed(decimals);
};

/**
 * Formats numbers as currency, based on size, and adds the appropriate suffix.
 *
 * @param {number} amount - The number to format
 * @param {string} currency - The currency to use
 * @param {number} decimals - The number of decimal places to include
 * @example
 * numberToCurrency(1024);
 *
 * @returns {string} - The formatted number
 */
export const numberToCurrency = (
  amount: number,
  currency = 'USD',
  decimals = 2,
): string => {
  return amount.toFixed(decimals) + ' ' + currency;
};
