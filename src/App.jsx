import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'finish all orders' }, style: { color: 'black' } },
  { id: '2', position: { x: -200, y: 100 }, data: { label: 'onion soup' }, style: { color: 'black' } },
  { id: '21', position: { x: -600, y: 200 }, data: { label: 'Get onion' }, style: { color: 'black' } },
  { id: '22', position: { x: -400, y: 200 }, data: { label: 'Boil onion' }, style: { color: 'black' } },
  { id: '23', position: { x: -200, y: 200 }, data: { label: 'Plate soup' }, style: { color: 'black' } },
  { id: '24', position: { x: 0, y: 200 }, data: { label: 'Deliver soup' }, style: { color: 'black' } },
  { id: '3', position: { x: 0, y: 100 }, data: { label: 'tomato soup' }, style: { color: 'black' } },
  { id: '4', position: { x: 200, y: 100 }, data: { label: 'onion-soup-base with tomato top' }, style: { color: 'black' } },
];
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-4', source: '1', target: '4' },
  { id: 'e2-21', source: '2', target: '21' },
  { id: 'e2-22', source: '2', target: '22' },
  { id: 'e2-23', source: '2', target: '23' },
  { id: 'e2-24', source: '2', target: '24' },
];

export default function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [label, setLabel] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [nodeName, setNodeName] = useState('');

  const onConnect = useCallback(
    (connection) => setEdges((oldEdges) => addEdge(connection, oldEdges)),
    [setEdges],
  );

  const addNodeAndEdge = () => {
    const sourceNode = nodes.find((node) => node.data.label === sourceLabel);
    if (!sourceNode) {
      alert(`Source node with label "${sourceLabel}" not found`);
      return;
    }

    const newNode = {
      id: `${nodes.length + 1}`,
      position: { x: sourceNode.position.x, y: sourceNode.position.y + 100 },
      data: { label: nodeName },
      style: { color: 'black' },
    };
    const newEdge = {
      id: `e${sourceNode.id}-${newNode.id}`,
      source: sourceNode.id,
      target: newNode.id,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <div className="update-node__controls" style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
          <label>Label:</label>
          <input
            value={nodeName}
            onChange={(evt) => setNodeName(evt.target.value)}
            style={{ marginRight: '10px' }}
          />
          <label className="update-node__source-label">Source:</label>
          <input
            value={sourceLabel}
            onChange={(evt) => setSourceLabel(evt.target.value)}
            style={{ marginRight: '10px' }}
          />
          <button
            onClick={addNodeAndEdge}
            className="stress-test__button"
          >
            Add Node and Edge
          </button>
        </div>
      </ReactFlow>
    </div>
  );
}
