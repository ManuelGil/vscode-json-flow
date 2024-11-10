import { useEffect, useState } from 'react';
import './App.css';
import Loading from './components/Loading.tsx';
import UpdateNode from './components/UpdateNode.tsx';

type JsonType = {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
  parent: string;
  style: object;
};

const style = {
  width: 80,
  display: 'flex',
  padding: 0,
  marging: 0,
  borderColor: 'gray',
  justifyContent: 'center',
  fontSize: 8,
  background: 'transparent',
  color: 'rgb(182,182,182)',
};

const JsonFormater = (
  json: unknown,
  many: number,
  depth: number,
  array: JsonType[],
  parent: string
): JsonType[] => {
  if (Array.isArray(json)) {
    json.forEach((items) => {
      const item: JsonType = {
        id: String(items),
        data: { label: String(items) },
        position: { x: 100, y: depth * 10 },
        parent,
        style,
      };
      if (typeof items === 'object') {
        JsonFormater(items, many, depth + 100, array, parent);
      } else {
        array.push(item);
      }
    });
  } else if (typeof json === 'object' && json !== null) {
    Object.entries(json).forEach(([key, value], index) => {
      const items: JsonType = {
        id: String(key),
        data: {
          label: key + (typeof value === 'object' ? '' : `: ${value}`),
        },
        position: { x: index * 100, y: depth * 10 },
        parent,
        style,
      };

      array.push(items);
      JsonFormater(value, many + 1, depth * 1.5, array, String(key));
    });
  }
  return array;
};

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

function App() {
  const oldJson = vscode.getState();

  const [json, setJson] = useState(oldJson);

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'clearJson': {
          setJson(null);
          vscode.setState(null);
          break;
        }

        case 'setJson': {
          setJson(message.data);
          vscode.setState(message.data);
          break;
        }

        default: {
          break;
        }
      }
    });
  }, []);

  if (!json) {
    return <Loading />;
  }

  const jsonData = JsonFormater(json, Math.random() * 100, 10, [], '');

  return (
    <div className={'bg-stone-900'}>
      <UpdateNode nodesInitial={jsonData} />
    </div>
  );
}

export default App;
