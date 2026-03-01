import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
} from '@webview/components';
import { useDebouncedValue } from '@webview/hooks/useDebouncedValue';
import type { SearchProjectionMode } from '@webview/types';
import { focusNode } from '@webview/utils/viewport';
import type { InternalNode } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { Search, X } from 'lucide-react';
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ---------------------------------------------------------------------------
// Pure utility: shallow array comparison
// ---------------------------------------------------------------------------

function areMatchesEqual(prev: string[], next: string[]): boolean {
  if (prev.length !== next.length) {
    return false;
  }
  for (let idx = 0; idx < prev.length; idx++) {
    if (prev[idx] !== next[idx]) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Advanced Search Lite — token model and pure evaluator
// ---------------------------------------------------------------------------

type ParsedToken =
  | { kind: 'key'; value: string }
  | { kind: 'value'; value: string }
  | { kind: 'type'; value: string }
  | { kind: 'path'; value: string }
  | { kind: 'depth'; op: '>' | '<' | '='; n: number }
  | { kind: 'text'; value: string };

const STRUCTURED_PREFIXES = ['key:', 'value:', 'type:', 'path:'] as const;

/**
 * Parses an active search term into structured tokens.
 * Tokens are separated by whitespace with implicit AND semantics.
 *
 * Supported formats: key:v, value:v, type:v, path:v, depth>n, depth<n, depth=n, plainText.
 */
function parseSearchTokens(term: string): ParsedToken[] {
  const parts = term.trim().split(/\s+/);
  const tokens: ParsedToken[] = [];

  for (const raw of parts) {
    if (!raw) {
      continue;
    }

    let matched = false;
    for (const prefix of STRUCTURED_PREFIXES) {
      if (raw.length > prefix.length && raw.toLowerCase().startsWith(prefix)) {
        const val = raw.slice(prefix.length);
        tokens.push({
          kind: prefix.slice(0, -1) as 'key' | 'value' | 'type' | 'path',
          value: val,
        });
        matched = true;
        break;
      }
    }
    if (matched) {
      continue;
    }

    const depthMatch =
      raw.length >= 7 &&
      raw.toLowerCase().startsWith('depth') &&
      (raw[5] === '>' || raw[5] === '<' || raw[5] === '=');
    if (depthMatch) {
      const op = raw[5] as '>' | '<' | '=';
      const nStr = raw.slice(6);
      const n = Number.parseInt(nStr, 10);
      if (!Number.isNaN(n)) {
        tokens.push({ kind: 'depth', op, n });
        continue;
      }
    }

    tokens.push({ kind: 'text', value: raw });
  }

  return tokens;
}

/** Extracts the key portion from a "key: value" label, or the full label. */
function extractKey(label: string): string {
  const sepIdx = label.indexOf(': ');
  return sepIdx >= 0 ? label.slice(0, sepIdx) : label;
}

/** Extracts the value portion from a "key: value" label, or empty string. */
function extractValue(label: string): string {
  const sepIdx = label.indexOf(': ');
  return sepIdx >= 0 ? label.slice(sepIdx + 2) : '';
}

/** Computes depth from a JSON Pointer node ID. Graph root sentinel returns 0. */
function getDepth(nodeId: string): number {
  if (!nodeId.startsWith('/')) {
    return 0;
  }
  return nodeId.split('/').length - 1;
}

/**
 * Evaluates a single parsed token against a node.
 * Pure, O(1) per call. All string comparisons are case-insensitive.
 */
function evaluateToken(node: InternalNode, token: ParsedToken): boolean {
  const label = String((node.data as Record<string, unknown>)?.label || '');
  const lowerLabel = label.toLowerCase();

  switch (token.kind) {
    case 'text':
      return lowerLabel.includes(token.value.toLowerCase());
    case 'key':
      return extractKey(label)
        .toLowerCase()
        .includes(token.value.toLowerCase());
    case 'value':
      return extractValue(label)
        .toLowerCase()
        .includes(token.value.toLowerCase());
    case 'type': {
      const nodeData = (node.data as Record<string, unknown>)?.data as
        | Record<string, unknown>
        | undefined;
      const nodeType = String(nodeData?.type || '').toLowerCase();
      return nodeType === token.value.toLowerCase();
    }
    case 'path':
      return node.id.toLowerCase().includes(token.value.toLowerCase());
    case 'depth': {
      const depth = getDepth(node.id);
      if (token.op === '>') {
        return depth > token.n;
      }
      if (token.op === '<') {
        return depth < token.n;
      }
      return depth === token.n;
    }
  }
}

// ---------------------------------------------------------------------------
// Component constants
// ---------------------------------------------------------------------------

const PROJECTION_MODES: {
  value: SearchProjectionMode;
  label: string;
  title: string;
}[] = [
  {
    value: 'highlight',
    label: 'All',
    title: 'Highlight matches, show all nodes',
  },
  {
    value: 'focus-context',
    label: 'Tree',
    title: 'Show matches and ancestor path',
  },
  { value: 'focus-strict', label: 'Only', title: 'Show matches only' },
];

// ---------------------------------------------------------------------------
// GoToSearch component
// ---------------------------------------------------------------------------

/**
 * GoToSearch provides a search interface to focus and navigate between nodes.
 * Supports structured query tokens (key:, value:, type:, path:, depth) and
 * configurable projection modes. Input and active search term are separated:
 * typing updates input only; debounce or Enter commits the active term.
 */
interface GoToSearchProps {
  nodes: InternalNode[];
  searchableNodes: InternalNode[];
  allNodes?: InternalNode[];
  searchProjectionMode: SearchProjectionMode;
  onSearchProjectionModeChange: (mode: SearchProjectionMode) => void;
  onMatchChange?: (matchedIds: Set<string>) => void;
}

export function GoToSearch({
  nodes,
  searchableNodes,
  allNodes,
  searchProjectionMode,
  onSearchProjectionModeChange,
  onMatchChange,
}: GoToSearchProps) {
  const [searchTermInput, setSearchTermInput] = useState<string>('');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string | null>(null);
  const debouncedInput = useDebouncedValue<string>(searchTermInput, 250);

  const [matches, setMatches] = useState<string[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const reactFlow = useReactFlow();

  const shouldCenterRef = useRef<boolean>(false);
  const prevActiveTermRef = useRef<string | null>(null);

  const previousAllNodesRef = useRef<InternalNode[] | undefined>(undefined);

  // --- Clear / Reset ---

  const clearSearch = useCallback(() => {
    setSearchTermInput('');
    setActiveSearchTerm(null);
    setMatches([]);
    setCurrentMatchIdx(-1);
    setSearchError(null);
    onSearchProjectionModeChange('highlight');
  }, [onSearchProjectionModeChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setDropdownOpen(open);
      if (!open) {
        clearSearch();
      }
    },
    [clearSearch],
  );

  const resetSearchOnDatasetChange = useCallback((): void => {
    if (previousAllNodesRef.current === allNodes) {
      return;
    }
    previousAllNodesRef.current = allNodes;
    shouldCenterRef.current = false;
    setSearchTermInput('');
    setActiveSearchTerm(null);
    setMatches([]);
    setCurrentMatchIdx(-1);
    onSearchProjectionModeChange('highlight');
  }, [allNodes, onSearchProjectionModeChange]);

  // --- Commit: debounce → activeSearchTerm ---

  useEffect(() => {
    const trimmed = debouncedInput?.trim() || '';
    if (trimmed.length >= 2) {
      setActiveSearchTerm(trimmed);
    }
    // Clearing the input does NOT clear activeSearchTerm;
    // only the explicit Clear button does that.
  }, [debouncedInput]);

  // --- Label index (fast path for single plain-text tokens) ---

  const buildLabelIndex = useCallback(
    (nodeList: InternalNode[]): Map<string, string[]> => {
      const map = new Map<string, string[]>();
      for (const node of nodeList) {
        const raw = (node.data as Record<string, unknown>)?.label;
        if (!raw) {
          continue;
        }
        const label = String(raw).toLowerCase().trim();
        if (!label) {
          continue;
        }
        if (!map.has(label)) {
          map.set(label, []);
        }
        map.get(label)!.push(node.id);
      }
      return map;
    },
    [],
  );

  const labelIndex = useMemo(
    () => buildLabelIndex(searchableNodes),
    [searchableNodes, buildLabelIndex],
  );

  const allLabelIndex = useMemo(
    () => (allNodes ? buildLabelIndex(allNodes) : labelIndex),
    [allNodes, labelIndex, buildLabelIndex],
  );

  // --- Match computation with ASL token evaluator ---

  /**
   * Finds all node IDs matching the active search term.
   * Supports structured tokens (key:, value:, type:, path:, depth) with
   * implicit AND across tokens. Falls back to label-includes for plain text.
   */
  const findMatchingNodeIds = useCallback(
    (term: string): string[] => {
      if (!term || term.trim().length === 0) {
        return [];
      }

      if (!searchableNodes.length) {
        setSearchError('Graph not ready yet');
        return [];
      }

      setSearchError(null);

      const tokens = parseSearchTokens(term);
      if (tokens.length === 0) {
        return [];
      }

      // Fast path: single plain-text token with exact label index hit
      if (tokens.length === 1 && tokens[0].kind === 'text') {
        const lowerVal = tokens[0].value.toLowerCase();
        if (labelIndex.has(lowerVal)) {
          return labelIndex.get(lowerVal)!;
        }
      }

      return searchableNodes
        .filter((node) => {
          if (!node || !node.id) {
            return false;
          }
          return tokens.every((token) => evaluateToken(node, token));
        })
        .map((node) => node.id);
    },
    [searchableNodes, labelIndex],
  );

  // --- Navigation ---

  const focusMatch = useCallback(
    (idx: number) => {
      if (
        !Array.isArray(matches) ||
        matches.length === 0 ||
        idx < 0 ||
        idx >= matches.length
      ) {
        return;
      }

      const matchId = matches[idx];
      if (!matchId) {
        return;
      }

      const node = nodes.find((n) => n && n.id === matchId);

      if (!node || !node.position) {
        return;
      }

      try {
        focusNode(reactFlow, node);
      } catch {
        // Swallowed: setCenter may fail if the viewport is not ready
      }
    },
    [nodes, matches, reactFlow],
  );

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event && event.target) {
      setSearchTermInput(event.target.value || '');
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        const trimmed = searchTermInput.trim();
        if (trimmed.length >= 2) {
          setActiveSearchTerm(trimmed);
        }
      }
    },
    [searchTermInput],
  );

  const goToPrev = useCallback(() => {
    if (!Array.isArray(matches) || matches.length === 0) {
      return;
    }

    const currentIdx =
      typeof currentMatchIdx === 'number' ? currentMatchIdx : 0;
    const newIdx = (currentIdx - 1 + matches.length) % matches.length;

    shouldCenterRef.current = true;
    setCurrentMatchIdx(newIdx);
  }, [matches, currentMatchIdx]);

  const goToNext = useCallback(() => {
    if (!Array.isArray(matches) || matches.length === 0) {
      return;
    }

    const currentIdx =
      typeof currentMatchIdx === 'number' ? currentMatchIdx : 0;
    const newIdx = (currentIdx + 1) % matches.length;

    shouldCenterRef.current = true;
    setCurrentMatchIdx(newIdx);
  }, [matches, currentMatchIdx]);

  // --- Effects ---

  // Compute matches from activeSearchTerm
  useEffect(() => {
    try {
      const activeTermChanged = activeSearchTerm !== prevActiveTermRef.current;
      prevActiveTermRef.current = activeSearchTerm;

      if (activeSearchTerm && activeSearchTerm.length >= 2) {
        try {
          const found = findMatchingNodeIds(activeSearchTerm);
          const safeFound = Array.isArray(found) ? found : [];

          setMatches((prev) =>
            areMatchesEqual(prev, safeFound) ? prev : safeFound,
          );
          if (activeTermChanged) {
            shouldCenterRef.current = true;
            setCurrentMatchIdx(safeFound.length > 0 ? 0 : -1);
          }
        } catch {
          setMatches([]);
          setCurrentMatchIdx(-1);
        }
      } else {
        setMatches([]);
        setCurrentMatchIdx(-1);
      }
    } catch {
      setMatches([]);
      setCurrentMatchIdx(-1);
    }
  }, [activeSearchTerm, findMatchingNodeIds]);

  useEffect(() => {
    onMatchChange?.(new Set(matches));
  }, [matches, onMatchChange]);

  useEffect(resetSearchOnDatasetChange, [resetSearchOnDatasetChange]);

  useEffect(() => {
    if (matches.length === 0) {
      if (currentMatchIdx !== -1) {
        setCurrentMatchIdx(-1);
      }
      return;
    }
    if (currentMatchIdx >= matches.length && currentMatchIdx !== 0) {
      setCurrentMatchIdx(0);
    }
  }, [matches, currentMatchIdx]);

  useEffect(() => {
    if (shouldCenterRef.current && matches.length > 0 && currentMatchIdx >= 0) {
      shouldCenterRef.current = false;
      focusMatch(currentMatchIdx);
    }
  }, [matches, currentMatchIdx, focusMatch]);

  // --- Derived render values ---

  const matchCount = useMemo(() => {
    return Array.isArray(matches) ? matches.length : 0;
  }, [matches]);

  const hiddenMatchCount = useMemo(() => {
    if (!allNodes || !activeSearchTerm) {
      return 0;
    }
    const trimmed = activeSearchTerm.trim().toLowerCase();
    if (trimmed.length < 2) {
      return 0;
    }
    let totalCount = 0;
    if (allLabelIndex.has(trimmed)) {
      totalCount = allLabelIndex.get(trimmed)!.length;
    } else {
      totalCount = allNodes.filter((node) =>
        String((node.data as Record<string, unknown>)?.label || '')
          .toLowerCase()
          .includes(trimmed),
      ).length;
    }
    return Math.max(0, totalCount - matchCount);
  }, [allNodes, allLabelIndex, activeSearchTerm, matchCount]);

  const hasMatches = matchCount > 0;
  const currentMatch = hasMatches ? currentMatchIdx + 1 : 0;
  const showHiddenIndicator =
    searchProjectionMode === 'highlight' && !hasMatches && hiddenMatchCount > 0;
  const showClearButton =
    searchTermInput.length > 0 || activeSearchTerm !== null;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" tooltip="Search nodes">
          <Search />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="flex w-64 flex-col gap-2 rounded-lg border border-muted bg-background/95 p-2 shadow-xl">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <Input
            type="text"
            value={searchTermInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`w-full rounded-md border border-input py-1.5 pl-8 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 ${showClearButton ? 'pr-8' : 'pr-2'}`}
            placeholder="Search nodes..."
            autoFocus
            spellCheck={false}
            maxLength={64}
          />
          {showClearButton && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-input bg-muted p-0.5">
          {PROJECTION_MODES.map((mode) => (
            <Button
              key={mode.value}
              size="sm"
              variant={
                searchProjectionMode === mode.value ? 'default' : 'ghost'
              }
              onClick={() => onSearchProjectionModeChange(mode.value)}
              tooltip={mode.title}
              aria-label={mode.title}
              className="h-6 flex-1 rounded px-2 text-xs"
            >
              {mode.label}
            </Button>
          ))}
        </div>
        <div className="my-0 border-t border-muted" />
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-xs px-2 py-1 rounded-md font-mono ${hasMatches ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
            title={searchError || undefined}
          >
            {searchError
              ? searchError
              : hasMatches
                ? `${currentMatch}/${matchCount}${searchProjectionMode === 'highlight' && hiddenMatchCount > 0 ? ` (+${hiddenMatchCount} hidden)` : ''}`
                : '0/0'}
          </span>
          <div className="flex items-center gap-0.5 rounded-md border border-input bg-muted px-1 py-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={goToPrev}
              disabled={!hasMatches}
              tooltip="Previous match"
              aria-label="Previous match"
              className="h-7 w-7 rounded-md border-none px-1 py-0.5"
            >
              &#8592;
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={goToNext}
              disabled={!hasMatches}
              tooltip="Next match"
              aria-label="Next match"
              className="h-7 w-7 rounded-md border-none px-1 py-0.5"
            >
              &#8594;
            </Button>
          </div>
        </div>
        {showHiddenIndicator && (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900"
            role="status"
            aria-live="polite"
          >
            Matches exist in collapsed branches
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
