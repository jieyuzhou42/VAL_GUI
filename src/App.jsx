import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import subtasks from './subtasks.json';

const parentNode = {
  id: '1',
  position: { x: 0, y: 0 },
  data: { label: `${subtasks.head.name} ${subtasks.head.V}` },
  style: { color: 'black' },
};

const initialNodes = [parentNode];
const initialEdges = [];

const buttonNode = {
  id: '2',
  position: { x: 200, y: 0 },
  data: { label: 'V', onClick: () => console.log('true') },
  style: { color: 'black', cursor: 'pointer' },
};

initialNodes.push(buttonNode);
initialEdges.push({
  id: 'e1-2',
  source: '1',
  target: '2',
});

let maxYPosition = 0;

subtasks.subtasks.forEach((task, index) => {
  const taskNode = {
    id: `${index + 3}`,
    position: { x: 400, y: index * 100 },
    data: { label: task.Task },
    style: { color: 'black' },
  };

  initialNodes.push(taskNode);
  initialEdges.push({
    id: `e2-${index + 3}`,
    source: '2',
    target: `${index + 3}`,
  });

  maxYPosition = Math.max(maxYPosition, taskNode.position.y);
});

const moreOptionsNode = {
  id: `${initialNodes.length + 1}`,
  position: { x: 400, y: maxYPosition + 100 },
  data: { label: 'More options', onClick: () => console.log('false') },
  style: { color: 'black', cursor: 'pointer' },
};

initialNodes.push(moreOptionsNode);

export default function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((oldEdges) => addEdge(connection, oldEdges)),
    [setEdges],
  );

  const onNodeClick = (event, node) => {
    if (node.data.onClick) {
      node.data.onClick();
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
      />
    </div>
  );
}