import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines and merges CSS class names using clsx and tailwind-merge.
 * Handles conditional classes and resolves Tailwind CSS conflicts.
 *
 * @param inputs - Class values to combine (strings, objects, arrays)
 * @returns Merged CSS class string with conflicts resolved
 *
 * @example
 * ```typescript
 * cn('bg-red-500', 'bg-blue-500') // 'bg-blue-500' (blue wins)
 * cn('p-4', { 'text-white': isActive }) // 'p-4 text-white' if isActive
 * cn(['flex', 'items-center'], 'justify-between') // 'flex items-center justify-between'
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
