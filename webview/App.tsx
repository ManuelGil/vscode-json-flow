import './App.css'
import UpdateNode from "./components/UpdateNode.tsx";


function isArray(json: unknown): json is any[] {
  return Array.isArray(json);
}

function isObject(json: unknown): json is NonNullable<unknown> {
  return typeof json === 'object' && json !== null;
}


type a = { id: string; data: { label: any; }; position: { x: number; y: number; }; father: string; }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const JsonFormater: a[] = (json: unknown, x: number, deep: number, array: a[], father: string) => {

  if (isArray(json)) {
    return (
      json.map((x) => (typeof x === 'object' ? JsonFormater(x, Math.random() * 100, deep + 100, array, father)
        : array.push(
          {
            id: String(x),
            data: { label: x },
            position: { x: 100, y: deep },
            father: father
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
              father: father
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
  const map = JsonFormater(problematicJson, Math.random() * 100, 100, []);

  return (

    <div>
      ##
      <div className={"w-full h-screen flex justify-center"}>
        <UpdateNode nodess={map[0][0][0]} />
      </div>
      ##
    </div>

  )
}

export default App
