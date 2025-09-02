import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import RequestUserTask from './requestUserTask';
import ConfirmBestMatchDecomposition from './confirm_best_match_decomposition';
import EditDecomposition from './EditDecomposition';
import Display from './Display';
import Chatbot from './chatbot';
import DisplayAddedMethod from './DisplayAddedMethod';
import './App.css';

const socket = io(); 
function App () {
  const [message, setMessage] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 50, y: 50 });
  // these are constants that pass through each components
  // all components just make changes to these constants
  // and display renders them

  useEffect(() => {
    socket.on('message', (data) => {
      console.log('Received from server:', data);
      setMessage(data);

      // ✅ If position information is present, update chatbot position for every message
      if (data?.position) {
        setChatbotPosition(data.position);
      }
    });
    return () => {
      socket.off('message');
    };
  }, []);

  const movedNodesRef = useRef(new Map()); // Store original positions of moved nodes

  useEffect(() => {
    if (showChatbot) {
      console.log("Chatbot is visible. Moving nodes...");
      setNodes(prevNodes =>
        prevNodes.map(node => {
          if (node.position.x > chatbotPosition.x - 50) {
            if (!movedNodesRef.current.has(node.id)) {
              console.log(`Saving original position of node ${node.id}: ${node.position.x}`);
              movedNodesRef.current.set(node.id, node.position.x); // Save original position
            }
            return {
              ...node,
              position: {
                ...node.position,
                x: node.position.x + 350, // Shift node to the right
              },
            };
          }
          return node;
        })
      );
      console.log("Moved nodes after moving:", Array.from(movedNodesRef.current.entries()));
    } else {
      console.log("Chatbot is hidden. Restoring nodes...");
      console.log("Nodes before restoring:", nodes.map(node => ({ id: node.id, x: node.position.x })));
      console.log("Moved nodes before restoring:", Array.from(movedNodesRef.current.entries()));
  
      // Force state update with restored nodes
      const restoredNodes = nodes.map(node => {
        if (movedNodesRef.current.has(node.id)) {
          console.log(`Restoring node ${node.id} to original x: ${movedNodesRef.current.get(node.id)}`);
          return {
            ...node,
            position: {
              ...node.position,
              x: movedNodesRef.current.get(node.id), // Restore original x position
            },
          };
        }
        return node;
      });
  
      console.log("Restored nodes:", restoredNodes.map(node => ({ id: node.id, x: node.position.x })));
      setNodes(restoredNodes); // Apply restored nodes to state
  
      // Check after state update
      setTimeout(() => {
        console.log("Nodes after restoring:", nodes.map(node => ({ id: node.id, x: node.position.x })));
        console.log("Clearing movedNodesRef...");
        movedNodesRef.current.clear(); // Clear the record of moved nodes
        console.log("Moved nodes after clearing:", Array.from(movedNodesRef.current.entries()));
      }, 0); // Check logs after state update
    }
  }, [showChatbot, chatbotPosition]);
  
  useEffect(() => {
    if (message?.type === 'display_added_method') {
      setShowChatbot(false); // Hide the chatbot
    }
  }, [message]);

  //after user create a method hide the chat box automatically
  useEffect(() => {
    if (message && message.type === 'confirm_best_match_decomposition') {
      setShowChatbot(false);
    }
  }, [message]);

  // Show chatbot when ask_subtasks message is received
  useEffect(() => {
    if (message?.type === 'ask_subtasks') {
      setShowChatbot(true);
    }
  }, [message]);

  useEffect(() => {
    if (message?.type === 'segment_confirmation') {
      setShowChatbot(true);
    }
  }, [message]);

  useEffect(() => {
    if (message?.type === 'request_user_task') {
      setNodes([]);
      setEdges([]);
    }
  }, [message]);
  
  // This function hide confirm component
  const handleConfirm = () => {
    setMessage(null);
  };
  console.log("nodes in app", nodes);

  // Add chatbot node when showChatbot is true
  useEffect(() => {
    if (showChatbot) {
      setNodes(prevNodes => {
        const otherNodes = prevNodes.filter(n => n.id !== 'chatbot-node');
        return [
          ...otherNodes,
          {
            id: 'chatbot-node',
            type: 'chatbot',
            position: {
              x: chatbotPosition.x,
              y: chatbotPosition.y - 200, // Offset the chatbot's vertical position by 200 units
            },
            data: { socket, message },
            draggable: false,
            selectable: false,
          }
        ];
      });
    }
  }, [showChatbot, message, chatbotPosition]); // include chatbotPosition  

  // Remove chatbot node when showChatbot becomes false
  useEffect(() => {
    if (!showChatbot) {
      setNodes(prev => prev.filter(n => n.id !== 'chatbot-node'));
    }
  }, [showChatbot]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }}>
      {message?.type === 'request_user_task' ? (
        <RequestUserTask data={message.text} />
      ) : (
        <>
          <Display 
            nodes={nodes} 
            edges={edges} 
            setNodes={setNodes} 
            setEdges={setEdges} 
          />

          {message?.type === 'confirm_best_match_decomposition' && (
            <ConfirmBestMatchDecomposition 
              data={message.text} 
              onConfirm={handleConfirm}
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              socket={socket}
            />
          )}
          {message?.type === 'display_added_method' && (
            <DisplayAddedMethod
            data={message.text} 
            onConfirm={handleConfirm}
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            socket={socket}
            />
          )}
          {message?.type === 'edit_decomposition' && <EditDecomposition data={message.text} />}
        </>
      )}
  </div>
  );
}

export default App;
