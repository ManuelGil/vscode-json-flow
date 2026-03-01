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
import { Search } from 'lucide-react';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/** Shallow comparison of two string arrays by length and element identity. */
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

/**
 * GoToSearch provides a search interface to focus and navigate between nodes
 * whose label includes a search term, with configurable projection modes.
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
  const [search, setSearch] = useState<string>('');
  const [matches, setMatches] = useState<string[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue<string>(search, 250);

  const reactFlow = useReactFlow();

  const shouldCenterRef = useRef<boolean>(false);
  const prevSearchRef = useRef<string>('');

  const previousAllNodesRef = useRef<InternalNode[] | undefined>(undefined);

  const resetSearchOnDatasetChange = useCallback((): void => {
    if (previousAllNodesRef.current === allNodes) {
      return;
    }
    previousAllNodesRef.current = allNodes;
    shouldCenterRef.current = false;
    setMatches([]);
    setCurrentMatchIdx(-1);
    onSearchProjectionModeChange('highlight');
  }, [allNodes, onSearchProjectionModeChange]);

  const buildLabelIndex = useCallback(
    (nodeList: InternalNode[]): Map<string, string[]> => {
      const map = new Map<string, string[]>();
      for (const node of nodeList) {
        const raw = node.data?.label;
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

  // Match computation uses searchableNodes (post-collapse, pre-projection)
  const labelIndex = useMemo(
    () => buildLabelIndex(searchableNodes),
    [searchableNodes, buildLabelIndex],
  );

  const allLabelIndex = useMemo(
    () => (allNodes ? buildLabelIndex(allNodes) : labelIndex),
    [allNodes, labelIndex, buildLabelIndex],
  );

  /**
   * Finds all node IDs whose label includes the search term (case-insensitive).
   * Searches within searchableNodes (post-collapse, pre-projection) to decouple
   * match computation from projection output.
   */
  const findMatchingNodeIds = useCallback(
    (term: string): string[] => {
      const lowerTerm = term.toLowerCase().trim();

      if (!lowerTerm || lowerTerm.length === 0) {
        return [];
      }

      if (!searchableNodes.length) {
        setSearchError('Graph not ready yet');
        return [];
      }

      setSearchError(null);

      if (labelIndex.has(lowerTerm)) {
        return labelIndex.get(lowerTerm)!;
      }

      return searchableNodes
        .filter((node) => {
          if (!node || !node.id) {
            return false;
          }

          return String(node.data?.label || '')
            .toLowerCase()
            .includes(lowerTerm);
        })
        .map((node) => node.id);
    },
    [searchableNodes, labelIndex],
  );

  /**
   * Focuses the node at the given index in the matches array.
   * Uses `nodes` (post-projection) for viewport centering.
   */
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
      setSearch(event.target.value || '');
    }
  }, []);

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

  useEffect(() => {
    try {
      const trimmedSearch = debouncedSearch?.trim() || '';
      const searchTermChanged = trimmedSearch !== prevSearchRef.current;
      prevSearchRef.current = trimmedSearch;

      if (trimmedSearch.length >= 2) {
        try {
          const found = findMatchingNodeIds(trimmedSearch);
          const safeFound = Array.isArray(found) ? found : [];

          setMatches((prev) =>
            areMatchesEqual(prev, safeFound) ? prev : safeFound,
          );
          if (searchTermChanged) {
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
  }, [debouncedSearch, findMatchingNodeIds]);

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

  const matchCount = useMemo(() => {
    return Array.isArray(matches) ? matches.length : 0;
  }, [matches]);

  const hiddenMatchCount = useMemo(() => {
    if (!allNodes || !debouncedSearch) {
      return 0;
    }
    const trimmed = debouncedSearch.trim().toLowerCase();
    if (trimmed.length < 2) {
      return 0;
    }
    let totalCount = 0;
    if (allLabelIndex.has(trimmed)) {
      totalCount = allLabelIndex.get(trimmed)!.length;
    } else {
      totalCount = allNodes.filter((node) =>
        String(node.data?.label || '')
          .toLowerCase()
          .includes(trimmed),
      ).length;
    }
    return Math.max(0, totalCount - matchCount);
  }, [allNodes, allLabelIndex, debouncedSearch, matchCount]);

  const hasMatches = matchCount > 0;
  const currentMatch = hasMatches ? currentMatchIdx + 1 : 0;
  const showHiddenIndicator =
    searchProjectionMode === 'highlight' && !hasMatches && hiddenMatchCount > 0;

  return (
    <DropdownMenu>
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
            value={search || ''}
            onChange={handleChange}
            className="w-full rounded-md border border-input py-1.5 pl-8 pr-2 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
            placeholder="Search nodes..."
            autoFocus
            spellCheck={false}
            maxLength={64}
          />
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
