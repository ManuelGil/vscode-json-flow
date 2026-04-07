import type { TreeMap } from '@webview/types';

/**
 * Best-effort structural validation for TreeMap.
 * Never throws and never mutates input.
 */
export function validateTreeSafe(tree: TreeMap): boolean {
  try {
    if (!tree || typeof tree !== 'object') {
      return false;
    }

    const ids = new Set(Object.keys(tree));
    if (ids.size === 0) {
      return false;
    }

    let isValid = true;

    for (const [id, node] of Object.entries(tree)) {
      if (!node || typeof node !== 'object') {
        isValid = false;
        continue;
      }

      if (typeof node.id !== 'string' || node.id !== id) {
        isValid = false;
      }

      if (typeof node.name !== 'string') {
        isValid = false;
      }

      const children = node.children;
      if (children !== undefined) {
        if (!Array.isArray(children)) {
          isValid = false;
        } else {
          for (const childId of children) {
            if (typeof childId !== 'string' || !ids.has(childId)) {
              isValid = false;
            }
          }
        }
      }
    }

    return isValid;
  } catch {
    return false;
  }
}
