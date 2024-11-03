import { useEffect, useState } from 'react';
import './App.css';
import UpdateNode from './components/UpdateNode.tsx';

type jsonType = {
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
  array: jsonType[],
  parent: string,
): jsonType[] => {
  if (Array.isArray(json)) {
    json.forEach((items) => {
      const item: jsonType = {
        id: String(items),
        data: { label: String(items) },
        position: { x: 100, y: depth },
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
      const items: jsonType = {
        id: String(key),
        data: {
          label: key + (typeof value === 'object' ? '' : `: ${value}`),
        },
        position: { x: index * 100, y: depth },
        parent,
        style,
      };

      array.push(items);
      JsonFormater(value, many + 1, depth * 1.5, array, String(key));
    });
  }
  return array;
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const vscode = acquireVsCodeApi();

function App() {
  const oldJson = vscode.getState();

  const [json, setJson] = useState(oldJson);

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data;
      setJson(message.json);
      vscode.setState(message.json);
    });
  }, []);

  const jsonData = JsonFormater(json, Math.random() * 100, 10, [], '');
  console.log('MAP', jsonData);
  return (
    <div className={'bg-stone-900'}>
      <UpdateNode nodesInitial={jsonData} />
    </div>
  );
}

export default App;
