/**
 * Returns the current date and time.
 *
 * @param {string} timeZone - Timezone
 * @example
 * now('America/New_York');
 *
 * @returns {number} - UNIX timestamp
 */
export const now = (timeZone: string): number => {
  const date = new Date();
  const time = date.toLocaleString('en-US', { timeZone });
  return new Date(time).getTime();
};

/**
 * Formats a date as a relative time.
 *
 * @param {Date} date - The date to format
 * @example
 * relativeTime(new Date());
 *
 * @returns {string} - The formatted date
 */
export const relativeTime = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + ' years ago';
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + ' months ago';
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + ' days ago';
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + ' hours ago';
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + ' minutes ago';
  }
  return Math.floor(seconds) + ' seconds ago';
};

/**
 * Formats a date as a time.
 *
 * @param {Date} date - The date to format
 * @example
 * formatTime(new Date());
 *
 * @returns {string} - The formatted time
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString();
};

/**
 * Formats a date as a date.
 *
 * @param {Date} date - The date to format
 * @example
 * formatDate(new Date());
 *
 * @returns {string} - The formatted date
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

/**
 * Formats a date as a date and time.
 *
 * @param {Date} date - The date to format
 * @example
 * formatDateTime(new Date());
 *
 * @returns {string} - The formatted date and time
 */
export const formatDateTime = (date: Date): string => {
  return date.toLocaleString();
};
