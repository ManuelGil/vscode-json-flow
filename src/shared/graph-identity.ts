/**
 * Graph-level identity constants.
 *
 * -----------------------------------------------------------------------
 * WHY THIS EXISTS — DO NOT MERGE GRAPH ROOT WITH JSON POINTER ROOT
 * -----------------------------------------------------------------------
 *
 * JSON Pointer (RFC 6901) uses "/" as the pointer to the empty-string
 * key inside the root document.  Our convention also uses "/" as the
 * POINTER_ROOT constant (see node-pointer.ts).
 *
 * If the graph's structural root node were assigned the ID "/", any JSON
 * document that contains an empty-string key ("") would produce a child
 * whose pointer is also "/", causing:
 *
 *   - Node ID collision in the TreeMap / React Flow node map
 *   - Root node override
 *   - Graph collapse to a single visible node
 *   - Silent data loss in the visualization
 *
 * The fix is architectural: the graph structural root uses a sentinel ID
 * that can NEVER be a valid JSON Pointer (it does not start with "/").
 * This guarantees zero collisions regardless of key content.
 *
 * INVARIANT: GRAPH_ROOT_ID must NOT start with "/" so it can never
 *            collide with any RFC 6901 pointer string.
 *
 * INVARIANT: All JSON data nodes continue to use valid JSON Pointer IDs
 *            built via buildPointer / POINTER_ROOT from node-pointer.ts.
 *
 * DO NOT rename this to "/" or any string starting with "/".
 * DO NOT merge this concept back into POINTER_ROOT.
 *
 * ARCHITECTURAL INVARIANT (frozen):
 * GRAPH_ROOT_ID and POINTER_ROOT belong to separate identity domains.
 * They must never be merged.
 * GRAPH_ROOT_ID must never start with '/'.
 * -----------------------------------------------------------------------
 *
 * Zero dependencies. No runtime-specific imports.
 * Safe to import from Extension Host, Webview, and Web Worker.
 */

/**
 * Sentinel ID for the graph's structural root node.
 *
 * This is intentionally NOT a valid JSON Pointer so that it can never
 * collide with any RFC 6901 pointer derived from document content.
 */
export const GRAPH_ROOT_ID: string = '__GRAPH_ROOT__';

/**
 * Display label for the graph root node.
 */
export const GRAPH_ROOT_LABEL: string = 'Root';
