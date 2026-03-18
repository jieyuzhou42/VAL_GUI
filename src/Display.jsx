import React, { useEffect } from 'react';
import { ReactFlow, Handle, Position, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Chatbot from './chatbot';

const nodeTypes = {
  chatbot: ({ data }) => (
    <div className="nodrag nopan" style={{ position: 'relative', pointerEvents: 'auto' }}>
      {/* Align handle vertically with regular task nodes (avoid awkward bend to mid-panel) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', top: 0, transform: 'none' }}
      />
      <Chatbot socket={data.socket} message={data.message} />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', top: 0, transform: 'none' }}
      />
    </div>
  )
};

function AutoFitView({ nodes }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length === 0) return;

    const frame = requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 250 });
    });

    return () => cancelAnimationFrame(frame);
  }, [nodes, fitView]);

  return null;
}

function Display({ nodes, edges }) {
    console.log("Display rendering with nodes:", nodes);
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', zIndex: 0 }}>
        <ReactFlow 
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            nodesDraggable={false}
            // This inline function deals with specific node that have onclick in their data
            // confirm, more options, add method and edit
            onNodeClick={(event, node) => {
                if (node.data.onClick) {
                  node.data.onClick();
                }
              }}
            fitView
        >
          <AutoFitView nodes={nodes} />
        </ReactFlow>
        </div>
    );
}

export default Display;