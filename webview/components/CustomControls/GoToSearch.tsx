import { useReactFlow } from '@xyflow/react';
import { Search } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
} from '@webview/components';

/**
 * GoToSearch component provides a search interface to focus the first node whose label or data includes a search term.
 * The search is case-insensitive and operates on all visible nodes in the graph.
 *
 * @returns A dropdown menu with a search input for node navigation.
 */
export function GoToSearch() {
  const [search, setSearch] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getNodes, setCenter } = useReactFlow();

  /**
   * Focuses the first node containing the provided search term (case-insensitive).
   * If a matching node is found, the viewport is centered on that node with an animated zoom.
   *
   * @param term - The search term to look for in node labels or data.
   */
  const focusNodeWithTerm = (term: string) => {
    const nodes = getNodes();
    const lowerTerm = term.toLowerCase();

    const targetNode = nodes.find((node) => {
      const label =
        typeof node.data?.label === 'string'
          ? node.data.label
          : typeof node.data === 'string'
            ? node.data
            : '';
      return label.toLowerCase().includes(lowerTerm);
    });

    if (!targetNode) {
      return;
    }

    const centerX = targetNode.position.x + (targetNode.width ?? 0) / 2;
    const centerY = targetNode.position.y + (targetNode.height ?? 0) / 2;

    setCenter(centerX, centerY, { zoom: 1.5, duration: 800 });
  };

  /**
   * Handles changes in the search input field. Debounces the search and triggers node focusing if the input is at least two characters.
   *
   * @param e - The change event from the input field.
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (value.trim().length >= 2) {
        focusNodeWithTerm(value);
      }
    }, 250);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" tooltip="Go to node by search">
          <Search />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <Input
          type="text"
          value={search}
          onChange={handleChange}
          className="w-48"
          placeholder="Search node..."
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
