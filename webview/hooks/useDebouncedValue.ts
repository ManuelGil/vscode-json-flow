import { useEffect, useRef, useState } from 'react';

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
  // Initialize with the provided value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // Use ref to track if the component is mounted
  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    // Ensure the delay is a positive number
    const safeDelay = typeof delay === 'number' && delay > 0 ? delay : 250;

    // Set up the timer to update the debounced value
    const handler = setTimeout(() => {
      // Only update if the component is still mounted
      if (isMounted.current) {
        setDebouncedValue(value);
      }
    }, safeDelay);

    // Cleanup function to avoid memory leaks
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  // Mark component as unmounted in cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return debouncedValue;
}
