import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  ReactFlow,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Display from "./Display";

const socket = io("http://localhost:4002");

function ConfirmBestMatchDecomposition({ data, onConfirm, nodes, edges, setNodes, setEdges }) {
  console.log("nodes in ConfirmDecomp:", nodes);

  useEffect(() => {
    // **If node is empty, create the parent node
    let parentNode = nodes.find(n => n.data.label.includes(data.head.name));
    if (!parentNode) {
      console.log("No parent node found. Creating parent node.");
      parentNode = {
        id: "1",
        position: { x: 0, y: 0 },
        data: { label: `${data.head.name} ${data.head.V}` },
        style: { color: 'black' },
      };
      setNodes(prev => [...prev, parentNode]);
    }

    console.log(" Creating child node.", nodes);
    const newNodes = [];
    const newEdges = [];
    let nodeId = nodes.length + 2; // maybe need to revised to hash value

    data.subtasks.forEach((task, subIndex) => {
      const taskNode = {
        id: `${nodeId}`,
        position: { 
          x: parentNode.position.x + 200, 
          y: parentNode.position.y + subIndex * 100 
        },
        data: { label: task.Task },
        style: { color: 'black' },
      };

      newNodes.push(taskNode);
      newEdges.push({
        id: `e-${parentNode.id}-${nodeId}`,
        source: parentNode.id,
        target: `${nodeId}`,
      });

      nodeId++;
    });

  setNodes(prev => [...prev, ...newNodes]);
  setEdges(prev => [...prev, ...newEdges]);
  }, [data]);


//click yes button
  const handleConfirm = (data) => {
    socket.emit("message", { type: "confirm_response", response: "yes" });
    onConfirm();
};

  const handleReject = () => {
      socket.emit("message", { type: "confirm_response", response: "no" });
      console.log("User rejected decomposition");
      onConfirm(null);
  };

  return (
    <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)' }}>
        <button onClick={() => handleConfirm(data)} style={{ marginRight: 10 }}>✔ Yes</button>
        <button onClick={handleReject}>❌ No</button>
    </div>
  );
}

export default ConfirmBestMatchDecomposition;