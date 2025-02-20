import React from 'react';
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function Display({ nodes, edges, setNodes, setEdges }) {
    console.log("Display rendering with nodes:", nodes);
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', zIndex: 0 }}>
        <ReactFlow 
            nodes={nodes}
            edges={edges}
            fitView
        />
        </div>
    );
}

export default Display;
