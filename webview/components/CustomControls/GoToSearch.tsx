import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
} from '@webview/components';
import { useDebouncedValue } from '@webview/hooks/useDebouncedValue';
import { useReactFlow } from '@xyflow/react';
import { Search } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

/**
 * GoToSearch component provides a search interface to focus and navigate between nodes
 * whose label or data includes a search term. Navigation is possible between all matches.
 *
 * @returns A dropdown menu with a search input and navigation controls for node navigation.
 */
export function GoToSearch() {
  const [search, setSearch] = useState<string>('');
  const [matches, setMatches] = useState<string[]>([]); // node ids of matches
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(-1); // Start at -1 when there is no selection
  const debouncedSearch = useDebouncedValue<string>(search, 250);

  // Safe access to ReactFlow functions
  const reactFlow = useReactFlow();
  const getNodes = useCallback(() => reactFlow?.getNodes() || [], [reactFlow]);
  const setCenter = useCallback(
    (x: number, y: number, options?: { zoom?: number; duration?: number }) => {
      if (reactFlow?.setCenter) {
        reactFlow.setCenter(x, y, options);
      }
    },
    [reactFlow],
  );

  // Build advanced search index (Map from label to nodeId[])
  const labelIndex = useMemo(() => {
    const map = new Map<string, string[]>();
    const nodes = getNodes();
    for (const node of nodes) {
      const label = String(node.data?.label || '').toLowerCase();

      if (!map.has(label)) {
        map.set(label, []);
      }

      map.get(label)!.push(node.id);
    }
    return map;
  }, [getNodes]);

  /**
   * Finds all node ids whose label or data includes the search term (case-insensitive).
   * Uses the label index for exact matches, and falls back to partial search if no exact match is found.
   * @param term The search term
   */
  const findMatchingNodeIds = useCallback(
    (term: string): string[] => {
      const lowerTerm = term.toLowerCase().trim();

      // Input validation
      if (!lowerTerm || lowerTerm.length === 0) {
        return [];
      }

      // Exact match using the index
      if (labelIndex.has(lowerTerm)) {
        return labelIndex.get(lowerTerm)!;
      }

      // Partial match fallback
      const nodes = getNodes();
      return nodes
        .filter((node) => {
          if (!node || !node.id) {
            return false;
          }

          const label =
            typeof node.data?.label === 'string'
              ? node.data.label
              : typeof node.data === 'string'
                ? node.data
                : '';
          return label.toLowerCase().includes(lowerTerm);
        })
        .map((node) => node.id);
    },
    [getNodes, labelIndex],
  );

  /**
   * Focuses the node at the given index in the matches array.
   * @param idx Index in matches array
   */
  const focusMatch = useCallback(
    (idx: number) => {
      // Improved validations to prevent access errors
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

      const nodes = getNodes();
      const node = nodes.find((n) => n && n.id === matchId);

      if (!node || !node.position) {
        return;
      }

      // Safe calculation of node center
      const width = node.width || 0;
      const height = node.height || 0;
      const centerX = node.position.x + width / 2;
      const centerY = node.position.y + height / 2;

      setCenter(centerX, centerY, { zoom: 1.5, duration: 800 });
    },
    [getNodes, matches, setCenter],
  );

  /**
   * Handles changes in the search input field. Debounces the search and updates matches.
   * @param event The change event from the input field.
   */
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event && event.target) {
      setSearch(event.target.value || '');
    }
  }, []);

  /**
   * Navigates to the previous match.
   */
  const goToPrev = useCallback(() => {
    if (!Array.isArray(matches) || matches.length === 0) {
      return;
    }

    // Ensure currentMatchIdx is a valid number
    const currentIdx =
      typeof currentMatchIdx === 'number' ? currentMatchIdx : 0;
    const newIdx = (currentIdx - 1 + matches.length) % matches.length;

    setCurrentMatchIdx(newIdx);
    // focusMatch(newIdx) removed; effect will handle focusing
  }, [matches, currentMatchIdx]);

  /**
   * Navigates to the next match.
   */
  const goToNext = useCallback(() => {
    if (!Array.isArray(matches) || matches.length === 0) {
      return;
    }

    // Ensure currentMatchIdx is a valid number
    const currentIdx =
      typeof currentMatchIdx === 'number' ? currentMatchIdx : 0;
    const newIdx = (currentIdx + 1) % matches.length;

    setCurrentMatchIdx(newIdx);
    // focusMatch(newIdx) removed; effect will handle focusing
  }, [matches, currentMatchIdx]);

  useEffect(() => {
    try {
      // Validate value before processing
      const trimmedSearch = debouncedSearch?.trim() || '';

      if (trimmedSearch.length >= 2) {
        try {
          const found = findMatchingNodeIds(trimmedSearch);
          // Ensure found is always an array
          const safeFound = Array.isArray(found) ? found : [];

          setMatches(safeFound);
          setCurrentMatchIdx(safeFound.length > 0 ? 0 : -1);
          // focusMatch(0) removed to avoid infinite loop
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

  // Focus the current match whenever matches or currentMatchIdx change
  useEffect(() => {
    if (matches.length > 0 && currentMatchIdx >= 0) {
      focusMatch(currentMatchIdx);
    }
  }, [matches, currentMatchIdx, focusMatch]);

  // Memoize state info for rendering
  const matchCount = useMemo(() => {
    return Array.isArray(matches) ? matches.length : 0;
  }, [matches]);

  const hasMatches = matchCount > 0;
  const currentMatch = hasMatches ? currentMatchIdx + 1 : 0;

  // Only render when there is valid content
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
        <div className="my-1 border-t border-muted" />
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-xs px-2 py-1 rounded-md font-mono ${hasMatches ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
          >
            {hasMatches ? `${currentMatch}/${matchCount}` : '0/0'}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
