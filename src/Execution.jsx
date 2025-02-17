import React, { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import executionData from './execution.json'; // Import the JSON data

const Execution = () => {
    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);

    useEffect(() => {
        const createNodesAndEdges = (tasks) => {
            console.log("Processing tasks:", tasks); 
            
            const initialNodes = [];
            const initialEdges = [];
            let nodeId = 1;

            tasks.forEach((task) => {
                const { head, subtasks } = task;

                // Convert level and order to actual positions
                const headPosition = { x: head.position.x * 200, y: head.position.y * 100 };
                console.log(headPosition)

                // Check if there is already a node at the specified position
                let parentNode = initialNodes.find(node => node.position.x === headPosition.x && node.position.y === headPosition.y);
                let parentId;

                if (!parentNode) {
                    // Add the head node if it doesn't exist
                    parentNode = {
                        id: `${nodeId}`,
                        position: headPosition,
                        data: { label: `${head.name} ${head.V}` },
                        style: { color: 'black' },
                    };

                    initialNodes.push(parentNode);
                    parentId = nodeId;
                    nodeId++;
                } else {
                    parentId = parentNode.id;
                }

                // Add subtasks to the head
                subtasks.forEach((subtask, subIndex) => {
                    const taskNode = {
                        id: `${nodeId}`,
                        position: { x: parentNode.position.x + 200, y: parentNode.position.y + (100 / (head.position.x + 1)) * subIndex },
                        data: { label: subtask.Task },
                        style: { color: 'black' },
                    };

                    initialNodes.push(taskNode);
                    initialEdges.push({
                        id: `e${parentId}-${nodeId}`,
                        source: `${parentId}`,
                        target: `${nodeId}`,
                    });

                    nodeId++;
                });
            });

            return { initialNodes, initialEdges };
        };

        const { initialNodes, initialEdges } = createNodesAndEdges(executionData.tasks);
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
            />
        </div>
    );
}

export default Execution;