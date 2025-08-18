/**
 * Heuristically detects the delimiter used in a delimited text content.
 * Considers a small set of common delimiters and scores them based on
 * how many lines look tabular (split length > 1) and consistency across lines.
 *
 * Preferred order is used as a stable tie-breaker.
 */
export function detectDelimiter(
  content: string,
  preferredOrder: string[] = [',', ';', '\t', '|'],
): string {
  const lines = content
    .split('\n')
    .map((l) => l.replace(/\r/g, ''))
    .filter((l) => l.trim().length > 0)
    .slice(0, 100); // limit for performance

  const candidates = Array.from(
    new Set(preferredOrder.length ? preferredOrder : [',', ';', '\t', '|']),
  );

  type Stats = { linesWithSep: number; avgCols: number; score: number };

  const scores = new Map<string, Stats>();

  for (const sep of candidates) {
    let linesWithSep = 0;
    let colsSum = 0;
    let colsCount = 0;
    let consistentCount = 0;
    let lastCols = -1;

    for (const line of lines) {
      // Avoid splitting quoted fields for now - simple heuristic only
      const parts = line.split(sep);
      const cols = parts.length;
      if (cols > 1) {
        linesWithSep++;
        colsSum += cols;
        colsCount++;
        if (lastCols === -1 || cols === lastCols) {
          consistentCount++;
        }
        lastCols = cols;
      }
    }

    const avgCols = colsCount > 0 ? colsSum / colsCount : 0;
    // Score prioritizes: many lines with separator, higher avg columns, consistency
    const score = linesWithSep * 10 + avgCols * 2 + consistentCount;
    scores.set(sep, { linesWithSep, avgCols, score });
  }

  // Pick highest score; tie-break by preferred order index
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const sep of candidates) {
    const s = scores.get(sep)!;
    if (s.score > bestScore) {
      best = sep;
      bestScore = s.score;
    } else if (s.score === bestScore) {
      const a = preferredOrder.indexOf(sep);
      const b = preferredOrder.indexOf(best);
      if (a !== -1 && b !== -1 && a < b) {
        best = sep;
      }
    }
  }

  return best;
}
