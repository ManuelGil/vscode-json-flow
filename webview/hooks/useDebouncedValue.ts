import { useEffect, useState } from 'react';

/**
 * useDebouncedValue
 * Returns a debounced version of the input value.
 * Useful for optimizing searches and intensive UI events.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 250ms)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const safeDelay = typeof delay === 'number' && delay > 0 ? delay : 250;

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, safeDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
