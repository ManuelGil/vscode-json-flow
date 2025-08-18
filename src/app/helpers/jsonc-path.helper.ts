// Internal tolerant implementation for JSON/JSONC (supports comments and trailing commas).
// Avoids depending on 'jsonc-parser' while keeping the existing contract.

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
 * Compute a route-by-indices nodeId (e.g., "root-0-2-5") from a cursor offset in the given JSON/JSONC text.
 * Returns undefined if the offset cannot be mapped.
 */
export function nodeIdFromOffset(
  text: string,
  offset: number,
): string | undefined {
  try {
    if (!text || offset == null) {
      return undefined;
    }
    const clamped = Math.max(0, Math.min(offset, text.length));
    const root = parseJsonTolerant(text);
    if (!root) {
      return 'root';
    }

    const jsonPath = findJsonPathAtOffset(root, clamped);
    const indices = jsonPath ? indicesPathFromJsonPath(root, jsonPath) : [];
    if (!indices) {
      return undefined;
    }
    return ['root', ...indices].join('-');
  } catch {
    return undefined;
  }
}

/**
 * Given a route-by-indices nodeId, return the byte range [start,end) of the corresponding node.
 * Returns undefined if it cannot be resolved.
 */
export function rangeFromNodeId(
  text: string,
  nodeId: string,
): { start: number; end: number } | undefined {
  try {
    if (!text || !nodeId) {
      return undefined;
    }
    const root = parseJsonTolerant(text);
    if (!root) {
      return undefined;
    }

    const parts = nodeId.split('-');
    if (!parts.length || parts[0] !== 'root') {
      return undefined;
    }
    const indices = parts
      .slice(1)
      .filter((p) => p.length > 0)
      .map((p) => Number.parseInt(p, 10));

    let current: AstNode | undefined = root;
    for (const idx of indices) {
      if (!current || !Array.isArray(current.children)) {
        return undefined;
      }
      if (current.type === 'object') {
        const propNode = current.children[idx];
        if (!propNode) {
          return undefined;
        }
        const valueNode = propNode.children?.[1] ?? propNode;
        current = valueNode;
      } else if (current.type === 'array') {
        const child = current.children[idx];
        if (!child) {
          return undefined;
        }
        current = child;
      } else {
        return undefined;
      }
    }

    if (!current) {
      return undefined;
    }
    return { start: current.offset, end: current.offset + current.length };
  } catch {
    return undefined;
  }
}

/**
 * Convert a standard jsonc-parser JSONPath (keys and array indices) to a route-by-indices path.
 * Walks the AST to determine the zero-based index of each property within its parent object,
 * and keeps array indices as-is.
 */
function indicesPathFromJsonPath(
  root: AstNode,
  jsonPath: (string | number)[],
): number[] | undefined {
  const indices: number[] = [];
  let current: AstNode | undefined = root;

  for (const seg of jsonPath) {
    if (!current || !Array.isArray(current.children)) {
      return undefined;
    }

    if (current.type === 'object') {
      let foundIndex = -1;
      for (let i = 0; i < current.children.length; i++) {
        const prop = current.children[i];
        const keyNode = prop?.children?.[0];
        if (keyNode && keyNode.value === seg) {
          foundIndex = i;
          current = prop.children?.[1] ?? prop;
          break;
        }
      }
      if (foundIndex < 0) {
        return undefined;
      }
      indices.push(foundIndex);
    } else if (current.type === 'array') {
      const idx =
        typeof seg === 'number' ? seg : Number.parseInt(String(seg), 10);
      if (!Number.isInteger(idx)) {
        return undefined;
      }
      const child = current.children[idx];
      if (!child) {
        return undefined;
      }
      indices.push(idx);
      current = child;
    } else {
      return undefined;
    }
  }

  return indices;
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
