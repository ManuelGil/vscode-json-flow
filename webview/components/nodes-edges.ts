interface TreeNode {
  id: string;
  name: string;
  children?: string[];
  siblings?: string[];
  spouses?: string[];
  type?: string;
  isSpouse?: boolean;
  isSibling?: boolean;
}

interface QueueItem {
  id: number;
  name: string;
  data: any;
}

interface Tree {
  [key: string]: TreeNode;
}

export const treeRootId = 1;

function generateTree(json: Record<string, any>): Tree {
  const tree: Tree = {};
  let currentId = 1;
  const queue: QueueItem[] = [{ id: currentId, name: 'root', data: json }];

  while (queue.length > 0) {
    const { id, name, data } = queue.shift()!;
    const node: TreeNode = { id: id.toString(), name };

    if (typeof data === 'object' && data !== null) {
      const childrenIds: string[] = [];

      for (const [key, value] of Object.entries(data)) {
        currentId++;
        childrenIds.push(currentId.toString());
        const childName = typeof value === 'string' ? value : key;
        queue.push({ id: currentId, name: childName, data: value });
      }

      if (childrenIds.length > 0) {
        node.children = childrenIds;
      }
    }

    tree[id.toString()] = node;
  }

  return tree;
}

interface FestivalData {
  festivalName: string;
  venue: {
    name: string;
    location: {
      city: string;
      coordinates: {
        lat: number;
        lng: number;
      };
      capacity: number;
    };
  };
  lineup: Array<{
    bandName: string;
    genre: string[];
    stageName: string;
    setTime: string;
    duration: number;
    productionNeeds: {
      equipment: string[];
      crew: number;
      specialEffects: boolean;
    };
  }>;
  tickets: {
    types: Array<{
      name: string;
      price: number;
      perks: string[];
      available: number;
      sold: number;
    }>;
    earlyBird: {
      active: boolean;
      discount: number;
      endDate: string;
    };
  };
  vendors: Array<{
    id: string;
    name: string;
    type: string;
    location: string;
    products: Array<{
      name: string;
      price: number;
      vegan: boolean;
    }>;
    ratings: {
      hygiene: number;
      quality: number;
      price: number;
    };
  }>;
  statistics: {
    attendance: {
      expected: number;
      current: number;
      peakHour: string;
    };
    revenue: {
      tickets: number;
      food: number;
      merchandise: number;
    };
  };
}

const jsonOpt = {
  "festivalName": "SonicVerse 2024",
  "venue": {
    "name": "Parque Solar",
    "location": {
      "city": "Valencia",
      "coordinates": {"lat": 39.4699, "lng": -0.3763},
      "capacity": 45000
    }
  },
  "lineup": [
    {
      "bandName": "Cosmic Pulse",
      "genre": ["electronic", "synthwave"],
      "stageName": "Luna",
      "setTime": "21:30",
      "duration": 90,
      "productionNeeds": {
        "equipment": ["synthesizers", "drum machine", "laser show"],
        "crew": 8,
        "specialEffects": true
      }
    }
  ],
  "tickets": {
    "types": [
      {
        "name": "VIP",
        "price": 299.99,
        "perks": ["backstage", "lounge", "parking"],
        "available": 500,
        "sold": 342
      },
      {
        "name": "General",
        "price": 89.99,
        "perks": ["general-access"],
        "available": 10000,
        "sold": 7823
      }
    ],
    "earlyBird": {
      "active": false,
      "discount": 0.15,
      "endDate": "2024-01-15"
    }
  },
  "vendors": [
    {
      "id": "V001",
      "name": "Sabores Urbanos",
      "type": "food",
      "location": "Zone A",
      "products": [
        {"name": "Tacos", "price": 8.50, "vegan": false},
        {"name": "Bowl Vegano", "price": 12.00, "vegan": true}
      ],
      "ratings": {
        "hygiene": 4.8,
        "quality": 4.6,
        "price": 4.0
      }
    }
  ],
  "statistics": {
    "attendance": {
      "expected": 40000,
      "current": 35420,
      "peakHour": "20:00"
    },
    "revenue": {
      "tickets": 892450.50,
      "food": 156780.25,
      "merchandise": 89340.00
    }
  }
} as const;

export const initialTree: Tree = generateTree(jsonOpt);

interface ExtendedTreeNode extends TreeNode {
  type?: string;
  isSpouse?: boolean;
  isSibling?: boolean;
}

interface ExtendedTree {
  [key: string]: ExtendedTreeNode;
}
