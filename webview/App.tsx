import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ThemeProvider } from '@webview/components';
import { FlowCanvas } from '@webview/components/FlowCanvas/FlowCanvas';

/**
 * Main App component.
 * Wraps FlowCanvas with ThemeProvider and ReactFlowProvider.
 * FlowCanvas owns the single flow state reducer (single source of truth).
 */
export default function App() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
