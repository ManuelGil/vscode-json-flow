import './App.css';
import UpdateNode from './components/UpdateNode.tsx';


type jsonType = {
  id: string;
  data: { label: any };
  position: { x: number; y: number };
  father: string;
  style: any;
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
  deep: number,
  array: any[],
  father: string,
): any => {
  if (Array.isArray(json)) {
    json.forEach((items) => {
      const item = {
        id: String(items),
        data: { label: items },
        position: { x: 100, y: deep },
        father: father,
        style: style,
      };
      if (typeof items === 'object') {
        JsonFormater(items, many, deep + 100, array, father);
      } else {
        array.push(item);
      }
    });
  } else if (typeof json === 'object' && json !== null) {
    Object.entries(json).forEach(([key, value], index) => {
      const items = {
        id: String(key),
        data: { label: `${key}: ${value}` },
        position: { x: index * 100, y: deep },
        father: father,
        style: style,
      };

      array.push(items);
      JsonFormater(value, many + 1, deep * 1.5, array, String(key));
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
      address: {
        street: '127.0.0.1',
        room: 3,
        fate: 30,
        array:['a','b','c','d','e','f'],
      },
    },
  ],
};


function App() {
  const map = JsonFormater(problematicJson, Math.random() * 100, 10, [], "");
  console.log("MAP",map)
  return (
    <div className={"bg-stone-900"}>
        <UpdateNode nodess={map} />
    </div>
  )
}

export default App
