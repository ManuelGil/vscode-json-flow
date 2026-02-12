/**
 * Build-time dev flag.
 * Replaced statically by Vite.
 * This is the ONLY allowed source of dev checks in webview code.
 */
export const IS_DEV: boolean = import.meta.env.DEV;
