export function getPointerSegments(pointer: string): string[] {
  if (!pointer) {
    return ['root'];
  }

  const segments: string[] = pointer
    .split('/')
    .filter((segment: string) => segment.length > 0);

  if (segments.length === 0) {
    return ['root'];
  }

  return ['root', ...segments];
}

export function getIndexFromPointer(pointer: string): string | undefined {
  if (!pointer) {
    return undefined;
  }

  const segments = pointer
    .split('/')
    .filter((segment: string) => segment.length > 0);

  if (segments.length === 0) {
    return undefined;
  }

  const lastSegment = segments[segments.length - 1];
  return /^\d+$/.test(lastSegment) ? lastSegment : undefined;
}

export function formatBreadcrumb(pointer: string): string {
  return getPointerSegments(pointer).join(' › ');
}
