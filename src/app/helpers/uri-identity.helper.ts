import { Uri } from 'vscode';

/**
 * Returns a stable identity key for a URI suitable for equality checks.
 */
export const toUriIdentityKey = (uri?: Uri): string | undefined => {
  if (!uri) {
    return undefined;
  }

  return uri.toString();
};

/**
 * Compares two URIs by their normalized identity key.
 */
export const isSameUriIdentity = (left?: Uri, right?: Uri): boolean => {
  const leftKey = toUriIdentityKey(left);
  const rightKey = toUriIdentityKey(right);

  return leftKey !== undefined && leftKey === rightKey;
};
