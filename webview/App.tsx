import './App.css';
import UpdateNode from './components/UpdateNode.tsx';

function isArray(json: unknown): json is any[] {
  return Array.isArray(json);
}

function isObject(json: unknown): json is NonNullable<unknown> {
  return typeof json === 'object' && json !== null;
}


type a = { id: string; data: { label: any; }; position: { x: number; y: number; }; father: string; style:any}
const JsonFormater = (json: unknown, many: number, deep: number, array: a[], father: string): any => {

  if (isArray(json)) {
    return (
      json.map((x) => (typeof x === 'object' ? JsonFormater(x, many, deep + 100, array, father)
        : array.push(
          {
            id: String(x),
            data: { label: x },
            position: { x: 100, y: deep },
            father: father,
            style: {
              width: 60,
              display: 'flex',
              padding: 0,
              marging: 0,
              borderColor: 'rgba(0,255,196,0.16)',
              justifyContent: 'center',
              fontSize: 8,
              background: 'transparent',
              color: 'rgb(182,182,182)',

            },
          }
        )))
    )
  }
  if (isObject(json)) {
    return (
      Object.entries(json).map(
        ([key, value], index) => {
          array.push(
            {
              id: String(key),
              data: { label: key },
              position: { x: index  * 100, y: deep },
              father: father,
              style: {
                width: 60,
                display: 'flex',
                padding: 0,
                marging: 0,
                borderColor: 'gray',
                justifyContent: 'center',
                fontSize: 8,
                background: 'transparent',
                color: 'rgb(182,182,182)',
              },
            }
          )
          return JsonFormater(value, many+1, deep * 1.5, array, String(key))
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
      address:{
        street: "127.0.0.1",
        room: 3,
        fate: 30,
        wtf:['string', 'string1']
      }
    }
  ]
};


function App() {
  const map = JsonFormater(problematicJson, Math.random() * 100, 10, [], "");
  return (
    <div className={"bg-stone-900"}>
        <UpdateNode nodess={map[0][0][0]} />
    </div>
  )
}

export default App
