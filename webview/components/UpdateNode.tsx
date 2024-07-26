// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import {ReactFlow, useEdgesState, useNodesState} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialEdges = [{id: 'e1-2', source: 'users', target: 'name'}];


const UpdateNode = ({nodess}: { nodess: any }) => {
    console.log("nodess", nodess);
    const [nodes, setNodes, onNodesChange] = useNodesState(nodess);
    const edge = nodess.map((x) => {
        if (x.father) {
            return (
                {
                    id: 'e'+x.id,
                    source: x.father,
                    target: x.id,
                }

            )

        }
        else null
    }).filter((x) => x);
    console.log("edge", edge);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edge);



    return (
        <div className={"w-screen h-screen"}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                defaultViewport={{x: 0, y: 0, zoom: 1.5}}
                minZoom={1}
                maxZoom={4}
                attributionPosition="bottom-left"
                fitView
                fitViewOptions={{padding: 0.5}}
            >
            </ReactFlow>

        </div>
    );
};

export default UpdateNode;
