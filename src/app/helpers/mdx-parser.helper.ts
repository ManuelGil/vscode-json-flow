import { throwError } from './error-handler.helper';
import { parseYaml } from './yaml-parser.helper';

/**
 * Matches a YAML frontmatter block delimited by `---` at the very start of the
 * document. Everything after the closing delimiter is intentionally ignored.
 */
const FRONTMATTER_PATTERN =
  /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?---[ \t]*(?:\r?\n|$)/;

/**
 * Extracts the raw YAML frontmatter of an MDX document.
 *
 * Only the block delimited by the opening and closing `---` markers is
 * returned; Markdown and JSX content are never inspected.
 *
 * @param content The raw MDX file content.
 * @returns The raw frontmatter text, or undefined when there is none.
 *
 * @example
 * extractMdxFrontmatter('---\ntitle: Demo\n---\n# Hi'); // 'title: Demo'
 */
export function extractMdxFrontmatter(content: string): string | undefined {
  const match = FRONTMATTER_PATTERN.exec(content);

  return match ? match[1] : undefined;
}

/**
 * Parses the YAML frontmatter of an MDX document as structured data.
 *
 * The MDX body (Markdown, JSX, imports, exports and expressions) is never
 * parsed, evaluated or executed: it is simply out of scope.
 *
 * @param content The raw MDX file content.
 * @returns The structured data contained in the frontmatter.
 * @throws Error when there is no frontmatter or it holds no structured data.
 *
 * @example
 * parseMdx('---\ntitle: Demo\n---\n<Component />'); // { title: 'Demo' }
 */
export function parseMdx(content: string): object {
  const frontmatter = extractMdxFrontmatter(content);

  if (frontmatter === undefined) {
    throwError('No YAML frontmatter found in MDX file');
  }

  const data = parseYaml(frontmatter);

  if (data === null || typeof data !== 'object') {
    throwError('MDX frontmatter does not contain structured data');
  }

  return data;
}
