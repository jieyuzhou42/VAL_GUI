import React, { useState } from 'react';
import { ReactFlow, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Chatbot from './chatbot';

const CHATBOT_WIDTH = 340;

const nodeTypes = {
  chatbot: () => (
    <div
      className="nodrag nopan"
      style={{
        width: CHATBOT_WIDTH,
        height: 1,
        background: 'transparent',
        border: 'none',
        pointerEvents: 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', top: 0, transform: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', top: 0, transform: 'none' }}
      />
    </div>
  )
};


function ChatbotOverlay({ nodes, viewport }) {
  const chatbotNode = nodes.find(node => node.id === 'chatbot-node');

  if (!chatbotNode) {
    return null;
  }

  const { socket, message } = chatbotNode.data ?? {};
  const left = viewport.x + chatbotNode.position.x * viewport.zoom;
  const top = viewport.y + chatbotNode.position.y * viewport.zoom;
  const chatbotScale = viewport.zoom;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 10,
        pointerEvents: 'none',
        transform: `scale(${chatbotScale})`,
        transformOrigin: 'top left',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <Chatbot socket={socket} message={message} />
      </div>
    </div>
  );
}

function Display({ nodes, edges }) {
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        nodesDraggable={false}
        onInit={instance => setViewport(instance.getViewport())}
        onMove={(_, nextViewport) => setViewport(nextViewport)}
        onNodeClick={(event, node) => {
          if (node.data.onClick) {
            node.data.onClick();
          }
        }}
      />
      <ChatbotOverlay nodes={nodes} viewport={viewport} />
    </div>
  );
}

export default Display;
