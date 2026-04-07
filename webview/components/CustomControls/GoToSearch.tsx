import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
} from '@webview/components';
import { useDebouncedValue } from '@webview/hooks/useDebouncedValue';
import { computeMatchesOptimized } from '@webview/services/searchService';
import type { GraphSnapshot, SearchProjectionMode } from '@webview/types';
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
  graphData?: GraphSnapshot | null;
  searchProjectionMode: SearchProjectionMode;
  onSearchProjectionModeChange: (mode: SearchProjectionMode) => void;
  onMatchChange?: (matchedIds: Set<string>) => void;
}

export function GoToSearch({
  nodes,
  searchableNodes,
  allNodes,
  graphData,
  searchProjectionMode,
  onSearchProjectionModeChange,
  onMatchChange,
}: GoToSearchProps) {
  const [searchTermInput, setSearchTermInput] = useState<string>('');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string | null>(null);
  const debouncedInput = useDebouncedValue<string>(searchTermInput, 250);

  const [matches, setMatches] = useState<string[]>([]);
  const [hiddenMatchCountState, setHiddenMatchCountState] = useState<number>(0);
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
    setHiddenMatchCountState(0);
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
    setHiddenMatchCountState(0);
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
    () => buildLabelIndex(allNodes || []),
    [allNodes, buildLabelIndex],
  );

  // --- Match computation using searchService ---

  /**
   * Finds all node IDs matching the active search term.
   * Delegates to searchService for pure domain logic.
   */
  const findMatchingNodeIds = useCallback(() => {
    if (!activeSearchTerm || activeSearchTerm.trim().length < 2) {
      return { visible: [], hiddenCount: 0 };
    }

    if (!allNodes || !allNodes.length) {
      setSearchError('Graph not ready yet');
      return { visible: [], hiddenCount: 0 };
    }

    setSearchError(null);

    const matches = computeMatchesOptimized(
      activeSearchTerm,
      allNodes,
      labelIndex,
      graphData ?? null,
    );
    const visibleIdSet = new Set(searchableNodes.map((n) => n.id));

    const visible = matches.filter((id) => visibleIdSet.has(id));
    const hiddenCount = matches.filter((id) => !visibleIdSet.has(id)).length;

    return { visible, hiddenCount };
  }, [activeSearchTerm, allNodes, searchableNodes, labelIndex, graphData]);

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
          const { visible, hiddenCount } = findMatchingNodeIds();
          const safeFound = Array.isArray(visible) ? visible : [];

          setMatches((prev) =>
            areMatchesEqual(prev, safeFound) ? prev : safeFound,
          );
          setHiddenMatchCountState(hiddenCount);

          if (activeTermChanged) {
            shouldCenterRef.current = true;
            setCurrentMatchIdx(safeFound.length > 0 ? 0 : -1);
          }
        } catch {
          setMatches([]);
          setHiddenMatchCountState(0);
          setCurrentMatchIdx(-1);
        }
      } else {
        setMatches([]);
        setHiddenMatchCountState(0);
        setCurrentMatchIdx(-1);
      }
    } catch {
      setMatches([]);
      setHiddenMatchCountState(0);
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

  const hiddenMatchCount = hiddenMatchCountState;

  const hasMatches = matchCount > 0;
  const currentMatch = hasMatches ? currentMatchIdx + 1 : 0;
  const showHiddenIndicator = !hasMatches && hiddenMatchCount > 0;
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
                ? `${currentMatch}/${matchCount}${hiddenMatchCount > 0 ? ` (+${hiddenMatchCount} hidden)` : ''}`
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
