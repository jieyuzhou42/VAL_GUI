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
// import subtasks from './subtasks1.json';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'finish all orders' }, style: { color: 'black' } },
  { id: '2', position: { x: 200, y: -100 }, data: { label: 'onion soup' }, style: { color: 'black' } },
  { id: '3', position: { x: 200, y: 0 }, data: { label: 'tomato soup' }, style: { color: 'black' } },
  { id: '4', position: { x: 200, y: 100 }, data: { label: 'onion-soup-base with tomato top' }, style: { color: 'black' } },
  { id: '5', position: { x: 400, y: 0 }, data: { label: 'onion soup base' }, style: { color: 'black' } },
  { id: '6', position: { x: 400, y: 100 }, data: { label: 'add topping' }, style: { color: 'black' } },
  { id: '7', position: { x: 400, y: 200 }, data: { label: 'boil soup' }, style: { color: 'black' } },
];
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-4', source: '1', target: '4' },
  { id: 'e4-5', source: '4', target: '5' },
  { id: 'e4-6', source: '4', target: '6' },
  { id: 'e4-7', source: '4', target: '7' },
];

export default function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((oldEdges) => addEdge(connection, oldEdges)),
    [setEdges],
  );

  const addNodeAndEdge = () => {
    const parentNode = nodes.find((node) => node.data.label === 'onion soup base');
    if (!parentNode) {
      alert('Parent node with label "onion soup base" not found');
      return;
    }
  
    let newNodes = [];
    let newEdges = [];
    let maxYPosition = parentNode.position.y;
  
    subtasks.forEach((group, groupIndex) => {
      const buttonNode = {
        id: `${nodes.length + newNodes.length + 1}`,
        position: { x: parentNode.position.x + 200, y: parentNode.position.y + 200 * groupIndex },
        data: { label: `+`, onClick: () => console.log(`true`) },
        style: { color: 'black', cursor: 'pointer' },
      };
  
      newNodes.push(buttonNode);
      newEdges.push({
        id: `e${parentNode.id}-${buttonNode.id}`,
        source: parentNode.id,
        target: buttonNode.id,
      });
  
      group.tasks.forEach((task, taskIndex) => {
        const taskNode = {
          id: `${nodes.length + newNodes.length + 1}`,
          position: { x: buttonNode.position.x + 200, y: buttonNode.position.y + 100 * (taskIndex - 1) },
          data: { label: task.label },
          style: { color: 'black' },
        };
  
        newNodes.push(taskNode);
        newEdges.push({
          id: `e${buttonNode.id}-${taskNode.id}`,
          source: buttonNode.id,
          target: taskNode.id,
        });
  
        maxYPosition = Math.max(maxYPosition, taskNode.position.y);
      });
  
      if (subtasks.length > 1) {
        const methodNode = {
          id: `${nodes.length + newNodes.length + 1}`,
          position: { x: buttonNode.position.x + 200, y: buttonNode.position.y + 100 * (group.tasks.length - 1) },
          data: { label: `+ Create method`, onClick: () => console.log(`+ Create method`) },
          style: { color: 'black', cursor: 'pointer' },
        };
  
        newNodes.push(methodNode);
  
        maxYPosition = Math.max(maxYPosition, methodNode.position.y);
      }
    });
  
    if (subtasks.length === 1) {
      const moreOptionsNode = {
        id: `${nodes.length + newNodes.length + 1}`,
        position: { x: parentNode.position.x + 400, y: maxYPosition + 100 },
        data: { label: 'More options', onClick: () => console.log('false') },
        style: { color: 'black', cursor: 'pointer' },
      };
  
      newNodes.push(moreOptionsNode);
    }
  
    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  };

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
      >
        <div className="update-node__controls" style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
          <button
            onClick={addNodeAndEdge}
            className="update_node__button"
          >
            Add Node and Edge
          </button>
        </div>
      </ReactFlow>
    </div>
  );
}