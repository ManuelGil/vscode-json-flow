import './App.css';
import UpdateNode from './components/UpdateNode.tsx';

function isArray(json: unknown): json is any[] {
  return Array.isArray(json);
}

function isObject(json: unknown): json is NonNullable<unknown> {
  return typeof json === 'object' && json !== null;
}


type a = { id: string; data: { label: any; }; position: { x: number; y: number; }; father: string; style:any}


const JsonFormater = (json: unknown, x: number, deep: number, array: a[], father: string): any => {

  if (isArray(json)) {
    return (
      json.map((x) => (typeof x === 'object' ? JsonFormater(x, Math.random() * 100, deep + 100, array, father)
        : array.push(
          {
            id: String(x),
            data: { label: x },
            position: { x: 100, y: deep },
            father: father,
            style: {
              width: 80,
              height: 80,
              background: 'transparent',
              color: 'rgb(247,192,192)',
            },
          }
        )))
    )
  }

  if (isObject(json)) {
    return (
      Object.entries(json).map(
        ([key, value]) => {
          array.push(
            {
              id: String(key),
              data: { label: key },
              position: { x: x, y: deep },
              father: father,
              style: {
                background: 'transparent',
                color: 'rgb(174,56,248)',
              },
            }
          )
          return JsonFormater(value, Math.random() * 100, deep + 100, array, String(key))
        }
      )
    )
  }
  return array
}
const problematicJson = {
  users: [
    {
      name: "tao",
      email: "tao@gmail.com",
      age: 31,
      tel: 312,
      new: true
    }
  ]
};


function App() {
  const map = JsonFormater(problematicJson, Math.random() * 100, 100, [], "");
  console.log(map)
  return (
    <div>
      <div className={"w-full h-screen"}>
        <UpdateNode nodess={map[0][0][0]} />
      </div>
    </div>

  )
}

export default App
