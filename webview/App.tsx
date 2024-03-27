import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>Visual Studio Code</h1>
      <div className="card">
        <VSCodeButton onClick={() => setCount((count) => count + 1)}>
          count is {count}
          <span slot="start" className="codicon codicon-add"></span>
        </VSCodeButton>
        <p>
          Edit <code>webview/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
