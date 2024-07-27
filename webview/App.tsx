import './App.css';
import UpdateNode from './components/UpdateNode.tsx';

function isArray(json: unknown): json is any[] {
  return Array.isArray(json);
}

function isObject(json: unknown): json is NonNullable<unknown> {
  return typeof json === 'object' && json !== null;
}

type a = {
  id: string;
  data: { label: any };
  position: { x: number; y: number };
  parent?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const JsonFormater = (
  json: unknown,
  x: number,
  deep: number,
  array: a[],
  parent?: string,
): any[] => {
  if (isArray(json)) {
    return json.map((node) =>
      typeof node === 'object'
        ? JsonFormater(node, Math.random() * 100, deep + 100, array, parent)
        : array.push({
            id: String(node),
            data: { label: node },
            position: { x: 100, y: deep },
            parent,
          }),
    );
  }

  if (isObject(json)) {
    return Object.entries(json).map(([key, value]) => {
      array.push({
        id: String(key),
        data: { label: key },
        position: { x: x, y: deep },
        parent,
      });
      return JsonFormater(
        value,
        Math.random() * 100,
        deep + 100,
        array,
        String(key),
      );
    });
  }
  return array;
};

const problematicJson = {
  users: [
    {
      name: 'tao',
      email: 'tao@gmail.com',
      age: 31,
      tel: 312,
      new: true,
    },
  ],
};

function App() {
  const map = JsonFormater(problematicJson, Math.random() * 100, 100, []);

  return (
    <div>
      ##
      <div className={'flex h-screen w-full justify-center'}>
        <UpdateNode nodeList={map[0][0][0]} />
      </div>
      ##
    </div>
  );
}

export default App;
