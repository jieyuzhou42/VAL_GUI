import React from 'react';
import { ReactFlow, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Chatbot from './chatbot';

const nodeTypes = {
  chatbot: ({ data }) => (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <Chatbot socket={data.socket} message={data.message} />
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </div>
  )
};

function Display({ nodes, edges }) {
    console.log("Display rendering with nodes:", nodes);
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', zIndex: 0 }}>
        <ReactFlow 
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            // This inline function deals with specific node that have onclick in their data
            // confirm, more options, add method and edit
            onNodeClick={(event, node) => {
                if (node.data.onClick) {
                  node.data.onClick();
                }
              }}
            fitView
        />
        </div>
    );
}

export default Display;