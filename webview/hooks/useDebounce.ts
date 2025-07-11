/**
 * Debounce hook and utilities for throttling function calls
 * Provides cleanup mechanism to prevent memory leaks
 */
import { useCallback, useEffect, useRef } from 'react';

/**
 * Creates a debounced version of a function with cleanup capability
 * @template T Function parameter types
 * @template R Function return type
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Object with debounced function and cancel method
 */
export function debounce<T extends unknown[], R = void>(
  fn: (...args: T) => R,
  delay: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debouncedFn = (...args: T) => {
    if (timer) {
      clearTimeout(timer);
    }

    return new Promise<R | undefined>((resolve) => {
      timer = setTimeout(() => {
        const result = fn(...args);
        resolve(result);
      }, delay);
    });
  };

  debouncedFn.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return debouncedFn;
}

/**
 * React hook that returns a debounced version of the provided function
 * Automatically handles cleanup on component unmount
 *
 * @template T Function parameter types
 * @template R Function return type
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @param deps Dependencies array for memoization
 * @returns Debounced function
 */
export function useDebounce<T extends unknown[], R = void>(
  fn: (...args: T) => R,
  delay: number,
  deps: React.DependencyList = [],
) {
  const debouncedFnRef = useRef<ReturnType<typeof debounce<T, R>> | undefined>(
    undefined,
  );

  // Create or update the debounced function when dependencies change
  useEffect(() => {
    debouncedFnRef.current = debounce(fn, delay);

    // Cleanup on unmount or when dependencies change
    return () => {
      debouncedFnRef.current?.cancel();
    };
  }, [fn, delay, ...deps]);

  // Create a stable wrapper function that calls the current debounced function
  const debouncedCallback = useCallback((...args: T) => {
    if (debouncedFnRef.current) {
      return debouncedFnRef.current(...args);
    }
    return undefined;
  }, []);

  return debouncedCallback;
}
