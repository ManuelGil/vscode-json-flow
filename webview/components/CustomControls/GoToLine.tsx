import { useReactFlow } from '@xyflow/react';
import { Search } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
} from '@webview/components';

export function GoToLine() {
  const [line, setLine] = useState<number | undefined>();
  const { getNodes, setCenter } = useReactFlow();

  const focusNodeAtLine = (targetLine: number) => {
    const nodes = getNodes();
    const targetNode = nodes.find((node) => node.data?.line === targetLine);

    if (targetNode) {
      const x = targetNode.position.x + (targetNode.width ?? 0) / 2;
      const y = targetNode.position.y + (targetNode.height ?? 0) / 2;
      setCenter(x, y, { zoom: 1.5, duration: 800 });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" tooltip="Go to line">
          <Search />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <Input
          type="number"
          value={line ?? ''}
          onChange={(e) => {
            const value = e.target.value ? Number(e.target.value) : undefined;
            setLine(value);
            if (value) {
              focusNodeAtLine(value);
            }
          }}
          className="w-24"
          placeholder="Line number..."
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
