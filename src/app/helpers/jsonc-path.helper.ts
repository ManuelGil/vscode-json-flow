// Internal tolerant implementation for JSON/JSONC (supports comments and trailing commas).
// Avoids
import {
  buildPointer,
  POINTER_ROOT,
  parsePointer,
} from '../../shared/node-pointer';

type JsonNodeType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'property';

interface AstNode {
  type: JsonNodeType;
  offset: number; // start byte (inclusive)
  length: number; // node length in bytes
  children?: AstNode[]; // for object: properties (type: 'property'), for array: elements
  // For 'property': children[0] = keyNode('string'), children[1] = valueNode
  value?: string | number | boolean | null; // for primitives or key string
}

/**
 * Compute a JSON Pointer nodeId (e.g., "/foo/bar/0") from a cursor
 * offset in the given JSON/JSONC text.
 * Returns undefined if the offset cannot be mapped.
 *
 * @param text - The JSON/JSONC text to parse and map
 * @param offset - The cursor offset (position) in the text
 * @returns A JSON Pointer node ID string, or undefined if mapping fails
 */
export function nodeIdFromOffset(
  text: string,
  offset: number,
): string | undefined {
  try {
    // Validate inputs
    if (!text || offset == null) {
      return undefined;
    }

    // Ensure offset is within valid text range
    const clamped = Math.max(0, Math.min(offset, text.length));

    // Parse JSON with tolerance for comments and other JSONC features
    const root = parseJsonTolerant(text);
    if (!root) {
      // If parsing fails but we have some text, return root as a fallback
      return POINTER_ROOT;
    }

    // Find path at the cursor position (key names for objects, indices for arrays)
    const jsonPath = findJsonPathAtOffset(root, clamped) ?? [];

    // Build the JSON Pointer by appending each path segment
    let pointer: string = POINTER_ROOT;
    for (const segment of jsonPath) {
      pointer = buildPointer(pointer, String(segment));
    }

    return pointer;
  } catch {
    return undefined;
  }
}

/**
 * Given a JSON Pointer nodeId, return the byte range [start,end) of the
 * corresponding node. Returns undefined if it cannot be resolved.
 *
 * @param text - The JSON/JSONC text to parse
 * @param nodeId - The node identifier as a JSON Pointer (e.g., "/foo/bar/0")
 * @returns An object with start and end offsets, or undefined if mapping fails
 */
export function rangeFromNodeId(
  text: string,
  nodeId: string,
): { start: number; end: number } | undefined {
  try {
    // Validate basic inputs
    if (!text || !nodeId) {
      return undefined;
    }

    // Parse the pointer into decoded segments (returns [] for root)
    let segments: string[];
    try {
      segments = parsePointer(nodeId);
    } catch {
      return undefined;
    }

    // Parse the JSON text tolerantly (allows comments, trailing commas, etc.)
    const root = parseJsonTolerant(text);
    if (!root) {
      return undefined;
    }

    // Navigate through the AST following the pointer segments
    let current: AstNode | undefined = root;
    for (const segment of segments) {
      // Validate current node can have children
      if (!current || !Array.isArray(current.children)) {
        return undefined;
      }

      // Navigate based on node type
      if (current.type === 'object') {
        // For objects, find the property whose key matches the segment
        let matched: AstNode | undefined;
        for (const prop of current.children) {
          const keyNode = prop.children?.[0];
          if (keyNode && String(keyNode.value ?? '') === segment) {
            matched = prop.children?.[1] ?? prop;
            break;
          }
        }
        if (!matched) {
          return undefined;
        }
        current = matched;
      } else if (current.type === 'array') {
        // For arrays, parse the segment as a numeric index
        const idx = Number.parseInt(segment, 10);
        if (!Number.isInteger(idx) || idx < 0) {
          return undefined;
        }
        const child = current.children[idx];
        if (!child) {
          return undefined;
        }
        current = child;
      } else {
        // Not a container type, can't continue navigation
        return undefined;
      }
    }

    // Final validation of the target node
    if (!current) {
      return undefined;
    }

    // Return the node's text range
    return { start: current.offset, end: current.offset + current.length };
  } catch {
    return undefined;
  }
}

function parseJsonTolerant(text: string): AstNode | undefined {
  let i = 0;

  i = skipWsAndComments(text, i);
  const result = parseValue(text, i);
  if (!result) {
    return undefined;
  }
  return result.node;
}

function parseValue(
  text: string,
  i: number,
): { node: AstNode; next: number } | undefined {
  i = skipWsAndComments(text, i);
  if (i >= text.length) {
    return undefined;
  }
  const ch = text[i];
  if (ch === '{') {
    return parseObject(text, i);
  }
  if (ch === '[') {
    return parseArray(text, i);
  }
  if (ch === '"') {
    return parseString(text, i);
  }
  if (ch === '-' || isDigit(ch)) {
    return parseNumber(text, i);
  }
  const lit = parseLiteral(text, i);
  if (lit) {
    return lit;
  }
  return undefined;
}

function parseObject(
  text: string,
  i: number,
): { node: AstNode; next: number } | undefined {
  const start = i;
  i++; // '{'
  const children: AstNode[] = [];
  i = skipWsAndComments(text, i);
  while (i < text.length && text[i] !== '}') {
    // key
    const keyRes = parseString(text, i);
    if (!keyRes) {
      break; // tolerant: abort remaining members
    }
    const keyNode = keyRes.node;
    i = keyRes.next;
    i = skipWsAndComments(text, i);
    if (text[i] !== ':') {
      break; // tolerant
    }
    i++;
    i = skipWsAndComments(text, i);
    const valRes = parseValue(text, i);
    if (!valRes) {
      break; // tolerant
    }
    const valueNode = valRes.node;
    i = valRes.next;
    const propNode: AstNode = {
      type: 'property',
      offset: keyNode.offset,
      length: valueNode.offset + valueNode.length - keyNode.offset,
      children: [keyNode, valueNode],
    };
    children.push(propNode);
    i = skipWsAndComments(text, i);
    if (text[i] === ',') {
      i++;
      i = skipWsAndComments(text, i);
      // allow trailing comma
      if (text[i] === '}') {
        break;
      }
      continue;
    }
  }
  // close object if possible
  while (i < text.length && text[i] !== '}') {
    i++;
  }
  if (i < text.length && text[i] === '}') {
    i++;
  }
  const node: AstNode = {
    type: 'object',
    offset: start,
    length: i - start,
    children,
  };
  return { node, next: i };
}

function parseArray(
  text: string,
  i: number,
): { node: AstNode; next: number } | undefined {
  const start = i;
  i++; // '['
  const children: AstNode[] = [];
  i = skipWsAndComments(text, i);
  while (i < text.length && text[i] !== ']') {
    const valRes = parseValue(text, i);
    if (!valRes) {
      break;
    }
    const valueNode = valRes.node;
    i = valRes.next;
    children.push(valueNode);
    i = skipWsAndComments(text, i);
    if (text[i] === ',') {
      i++;
      i = skipWsAndComments(text, i);
      // allow trailing comma
      if (text[i] === ']') {
        break;
      }
      continue;
    }
  }
  while (i < text.length && text[i] !== ']') {
    i++;
  }
  if (i < text.length && text[i] === ']') {
    i++;
  }
  const node: AstNode = {
    type: 'array',
    offset: start,
    length: i - start,
    children,
  };
  return { node, next: i };
}

function parseString(
  text: string,
  i: number,
): { node: AstNode; next: number } | undefined {
  if (text[i] !== '"') {
    return undefined;
  }
  const start = i;
  i++;
  let val = '';
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      i++;
      break;
    }
    if (ch === '\\') {
      // escape sequence
      if (i + 1 < text.length) {
        const nextCh = text[i + 1];
        val += decodeEscape(nextCh);
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    val += ch;
    i++;
  }
  const node: AstNode = {
    type: 'string',
    offset: start,
    length: i - start,
    value: val,
  };
  return { node, next: i };
}

function parseNumber(
  text: string,
  i: number,
): { node: AstNode; next: number } | undefined {
  const start = i;
  if (text[i] === '-') {
    i++;
  }
  while (i < text.length && isDigit(text[i])) {
    i++;
  }
  if (i < text.length && text[i] === '.') {
    i++;
    while (i < text.length && isDigit(text[i])) {
      i++;
    }
  }
  if (i < text.length && (text[i] === 'e' || text[i] === 'E')) {
    i++;
    if (text[i] === '+' || text[i] === '-') {
      i++;
    }
    while (i < text.length && isDigit(text[i])) {
      i++;
    }
  }
  const raw = text.slice(start, i);
  const num = Number(raw);
  const node: AstNode = {
    type: 'number',
    offset: start,
    length: i - start,
    value: Number.isFinite(num) ? num : undefined,
  };
  return { node, next: i };
}

function parseLiteral(
  text: string,
  i: number,
): { node: AstNode; next: number } | undefined {
  if (text.startsWith('true', i)) {
    return {
      node: { type: 'boolean', offset: i, length: 4, value: true },
      next: i + 4,
    };
  }
  if (text.startsWith('false', i)) {
    return {
      node: { type: 'boolean', offset: i, length: 5, value: false },
      next: i + 5,
    };
  }
  if (text.startsWith('null', i)) {
    return {
      node: { type: 'null', offset: i, length: 4, value: null },
      next: i + 4,
    };
  }
  return undefined;
}

function isDigit(ch: string): ch is string {
  return ch >= '0' && ch <= '9';
}

function decodeEscape(ch: string): string {
  switch (ch) {
    case '"':
      return '"';
    case '\\':
      return '\\';
    case '/':
      return '/';
    case 'b':
      return '\b';
    case 'f':
      return '\f';
    case 'n':
      return '\n';
    case 'r':
      return '\r';
    case 't':
      return '\t';
    default:
      return ch;
  }
}

function skipWsAndComments(text: string, i: number): number {
  while (i < text.length) {
    const ch = text[i];
    // whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      {
        i++;
        continue;
      }
    }
    // line comments //...
    if (ch === '/' && i + 1 < text.length && text[i + 1] === '/') {
      {
        i += 2;
        while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
          i++;
        }
        continue;
      }
    }
    // block comments /* ... */
    if (ch === '/' && i + 1 < text.length && text[i + 1] === '*') {
      {
        i += 2;
        while (
          i + 1 < text.length &&
          !(text[i] === '*' && text[i + 1] === '/')
        ) {
          i++;
        }
        if (i + 1 < text.length) {
          i += 2;
        }
        continue;
      }
    }
    break;
  }
  return i;
}

// ...

function contains(node: AstNode, pos: number): boolean {
  return pos >= node.offset && pos < node.offset + node.length;
}

function findJsonPathAtOffset(
  root: AstNode,
  pos: number,
): (string | number)[] | undefined {
  // Descend looking for the child that contains pos. In objects return keys, in arrays indices.
  const path: (string | number)[] = [];
  let current: AstNode | undefined = root;

  while (current && Array.isArray(current.children)) {
    if (current.type === 'object') {
      let picked: AstNode | undefined;
      let pickedKey: string | undefined;
      for (let i = 0; i < current.children.length; i++) {
        const prop = current.children[i];
        const keyNode = prop.children?.[0];
        const valNode = prop.children?.[1] ?? prop;
        if (!keyNode || !valNode) {
          continue;
        }
        if (
          contains(valNode, pos) ||
          contains(prop, pos) ||
          contains(keyNode, pos)
        ) {
          picked = valNode;
          pickedKey = String(keyNode.value ?? '');
          break;
        }
      }
      if (!picked) {
        // Heuristic: choose the last property whose start is <= pos
        for (let i = current.children.length - 1; i >= 0; i--) {
          const prop = current.children[i];
          const keyNode = prop.children?.[0];
          const valNode = prop.children?.[1] ?? prop;
          if (!keyNode || !valNode) {
            continue;
          }
          if (prop.offset <= pos) {
            picked = valNode;
            pickedKey = String(keyNode.value ?? '');
            break;
          }
        }
      }
      if (!picked || pickedKey == null) {
        break;
      }
      path.push(pickedKey);
      current = picked;
      continue;
    }
    if (current.type === 'array') {
      let foundIndex = -1;
      for (let i = 0; i < current.children.length; i++) {
        const child = current.children[i];
        if (contains(child, pos)) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex < 0) {
        // Heuristic: choose the last element whose start is <= pos
        for (let i = current.children.length - 1; i >= 0; i--) {
          const child = current.children[i];
          if (child.offset <= pos) {
            foundIndex = i;
            break;
          }
        }
      }
      if (foundIndex < 0) {
        break;
      }
      path.push(foundIndex);
      current = current.children[foundIndex];
      continue;
    }
    break;
  }

  return path;
}
