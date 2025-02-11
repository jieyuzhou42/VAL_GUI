import React, { useEffect, useState, useCallback, useMemo } from "react"; 
import { io } from "socket.io-client";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const socket = io("http://localhost:4002");

// Define Custom Node
const CustomNode = ({ id, data }) => {
    return (
        <div style={{
            padding: 10,
            background: '#f8f8f8',
            border: '1px solid #ccc',
            borderRadius: 5,
            textAlign: 'center',
            position: 'relative'
        }}>
            <div>{data.label}</div>
            <div style={{ marginTop: 10 }}>
                <button onClick={() => data.onAddSubtask(id)} style={{ marginRight: 5 }}>➕ Add</button>
                <button onClick={() => data.onDeleteNode(id)}>🗑️ Delete</button>
            </div>
            <Handle type="source" position={Position.Bottom} />
            <Handle type="target" position={Position.Top} />
        </div>
    );
};

function EditDecomposition({ data }) {
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (data) {
            setMessage(data);
            console.log("Message set:", data);
        }
    }, [data]);

    const createNodesAndEdges = useCallback((message) => {
        console.log("Processing message:", message);

        const initialNodes = [];
        const initialEdges = [];

        if (message && message.text) {
            const { head, subtasks } = message.text;

            // main task node
            const parentNode = {
                id: '1',
                position: { x: 0, y: 0 },
                data: { label: `${head.name} ${head.V}` },
                style: { color: 'black' },
            };

            initialNodes.push(parentNode);

            let maxYPosition = 0;

            // subtasks
            subtasks.forEach((task, index) => {
                const taskNode = {
                    id: `${index + 2}`,
                    type: 'custom', 
                    position: { x: 400, y: index * 100 },
                    data: { label: task.Task },
                };

                initialNodes.push(taskNode);
                initialEdges.push({
                    id: `e1-${index + 2}`,
                    source: '1',
                    target: `${index + 2}`,
                });

                maxYPosition = Math.max(maxYPosition, taskNode.position.y);
            });

            return { initialNodes, initialEdges };
        }

        return { initialNodes, initialEdges };
    }, []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (message) {
            const { initialNodes, initialEdges } = createNodesAndEdges(message);
            setNodes(initialNodes);
            setEdges(initialEdges);
        }
    }, [message, createNodesAndEdges]);

    const onConnect = useCallback(
        (connection) => setEdges((oldEdges) => addEdge(connection, oldEdges)),
        [setEdges]
    );

    // Add a subtask
    const onAddSubtask = useCallback(
        (parentId) => {
            setNodes((nds) => {
                const parentNode = nds.find((node) => node.id === parentId);
                if (!parentNode) return nds;

                const newYPosition = parentNode.position.y + 120;

                const updatedNodes = nds.map(node => 
                    node.position.y >= newYPosition ? { ...node, position: { ...node.position, y: node.position.y + 120 } } : node
                );

                const newNode = {
                    id: `${nds.length + 1}`,
                    type: 'custom',
                    position: { x: 400, y: newYPosition },
                    data: { label: `Subtask ${nds.length + 1}` }
                };

                return [...updatedNodes, newNode];
            });

            setEdges((eds) => [
                ...eds, 
                { id: `e-1-${nodes.length + 1}`, source: '1', target: `${nodes.length + 1}` } // Always connect to main node
            ]);
        },
        [setNodes, setEdges, nodes]
    );

    // Delete a subtask
    const onDeleteNode = useCallback(
        (id) => {
            setNodes((nds) => {
                const deletedNode = nds.find((node) => node.id === id);
                if (!deletedNode) return nds;

                return nds.filter((node) => node.id !== id).map(node => 
                    node.position.y > deletedNode.position.y ? { ...node, position: { ...node.position, y: node.position.y - 120 } } : node
                );
            });

            setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
        },
        [setNodes, setEdges]
    );

    // Use useMemo to cache nodeTypes
    const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <ReactFlow
                nodes={nodes.map((node) => ({
                    ...node,
                    data: { 
                        ...node.data, 
                        onAddSubtask, 
                        onDeleteNode
                    }
                }))}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
            />
        </div>
    );
}

export default EditDecomposition;

