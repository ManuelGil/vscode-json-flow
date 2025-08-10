import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ThemeProvider } from '@webview/components';
import { FlowCanvas } from '@webview/components/FlowCanvas/FlowCanvas';
import { FlowProvider } from '@webview/context/FlowContext';

/**
 * Main App component.
 * Wraps FlowCanvas with ThemeProvider and ReactFlowProvider.
 * If development mode is enabled, FlowCanvas will handle debug UI internally.
 */
export default function App() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        {/* Wrap FlowCanvas with FlowProvider to provide global flow state context */}
        <FlowProvider>
          <FlowCanvas />
        </FlowProvider>
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
