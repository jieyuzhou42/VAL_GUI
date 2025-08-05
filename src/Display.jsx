import React from 'react';
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Chatbot from './chatbot';

const nodeTypes = {
  chatbot: ({ data }) => (
    // <div style={{ width: '300px', height: '400px' }}>
      <Chatbot socket={data.socket} message={data.message} />
    // </div>
  )
};

function Display({ nodes, edges }) {
    console.log("Display rendering with nodes:", nodes);
    return (
        <div style={{ width: '90vw', height: '100vh', position: 'relative', zIndex: 0 }}>
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