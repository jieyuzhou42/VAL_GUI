import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const socket = io("http://localhost:4002");

function Request_user_task() {
    const [message, setMessage] = useState(null);
    const [input, setInput] = useState("");

    useEffect(() => {
        socket.on("message", (data) => {
            console.log("Received from server:", data);
            if (data && data.type === 'confirm_best_match_decomposition') {
                setMessage(data);
            } else {
                console.warn("Unexpected message type or empty data:", data);
            }
        });

        return () => {
            socket.off("message");
        };
    }, []);

    const sendMessage = () => {
        socket.emit("message", { message: input });
        setInput("");
    };

    const createNodesAndEdges = (message) => {
        console.log("Processing message:", message); 
        
        const initialNodes = [];
        const initialEdges = [];

        if (message && message.text) {
            const { head, subtasks } = message.text;

            const parentNode = {
                id: '1',
                position: { x: 0, y: 0 },
                data: { label: `${head.name} ${head.V}` },
                style: { color: 'black' },
            };

            initialNodes.push(parentNode);

            const buttonNode = {
                id: '2',
                position: { x: 200, y: 0 },
                data: { label: 'V', onClick: () => console.log('yes') },
                style: { color: 'black', cursor: 'pointer' },
            };

            initialNodes.push(buttonNode);
            initialEdges.push({
                id: 'e1-2',
                source: '1',
                target: '2',
            });

            let maxYPosition = 0;

            subtasks.forEach((task, index) => {
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
                data: { label: 'More options', onClick: () => console.log('no') },
                style: { color: 'black', cursor: 'pointer' },
            };

            initialNodes.push(moreOptionsNode);
        }

        return { initialNodes, initialEdges };
    };

    useEffect(() => {
        console.log("Messages state updated:", message); 
        if (message) {
            const { initialNodes, initialEdges } = createNodesAndEdges(message);
            setNodes(initialNodes);
            setEdges(initialEdges);
        }
    }, [message]);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

export default Request_user_task;