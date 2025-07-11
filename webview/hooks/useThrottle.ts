/**
 * Throttle hook and utilities for limiting function call frequency
 * Provides cleanup mechanism to prevent memory leaks
 */
import { useCallback, useEffect, useRef } from 'react';

/**
 * Creates a throttled version of a function with cleanup capability
 * @template T Function parameter types
 * @param fn Function to throttle
 * @param delay Minimum time between invocations in milliseconds
 * @returns Object with throttled function and cancel method
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  delay = 300,
) {
  let inThrottle = false;
  let lastArgs: T | undefined;
  let lastThis: unknown;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // Use explicit typing for this context
  const throttledFn = function (this: unknown, ...args: T) {
    // Store the latest arguments
    lastArgs = args;
    lastThis = this;

    if (!inThrottle) {
      inThrottle = true;
      const result = fn.apply(lastThis, args);

      timeoutId = setTimeout(() => {
        inThrottle = false;
        executeLastCall();
      }, delay);

      return result;
    }

    // Return a promise that resolves when the throttled function is called again
    return new Promise<void>((resolve) => {
      // Will be resolved in the next call cycle
    });
  };

  const executeLastCall = () => {
    if (lastArgs) {
      fn.apply(lastThis, lastArgs);
      lastArgs = undefined;
    }
  };

  throttledFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    inThrottle = false;
    lastArgs = undefined;
  };

  return throttledFn as unknown as ((...args: T) => void | undefined) & {
    cancel: () => void;
  };
}

/**
 * React hook that returns a throttled version of the provided function
 * Automatically handles cleanup on component unmount
 *
 * @template T Function parameter types
 * @param fn Function to throttle
 * @param delay Minimum time between invocations in milliseconds
 * @param deps Dependencies array for memoization
 * @returns Throttled function
 */
export function useThrottle<T extends unknown[]>(
  fn: (...args: T) => void,
  delay = 300,
  deps: React.DependencyList = [],
): (...args: T) => void | undefined {
  const throttledFnRef = useRef<ReturnType<typeof throttle<T>> | undefined>(
    undefined,
  );

  // Create or update the throttled function when dependencies change
  useEffect(() => {
    throttledFnRef.current = throttle(fn, delay);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (throttledFnRef.current) {
        throttledFnRef.current.cancel();
      }
    };
  }, [fn, delay, ...deps]);

  // Create a stable wrapper function that calls the current throttled function
  const throttledCallback = useCallback(
    (...args: T) => {
      if (throttledFnRef.current) {
        return throttledFnRef.current(...args);
      }
      return undefined;
    },
    [], // No need to depend on the ref itself as it's stable
  );

  return throttledCallback;
}
