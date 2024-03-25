import { useState } from 'react';
import visualstudiocodeLogo from '/assets/visualstudiocode.svg';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://code.visualstudio.com/" target="_blank">
          <img
            src={visualstudiocodeLogo}
            className="logo react"
            alt="React logo"
          />
        </a>
      </div>
      <h1>Visual Studio Code</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
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
