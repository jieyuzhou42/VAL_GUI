import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import RequestUserTask from './requestUserTask';
import ConfirmBestMatchDecomposition from './confirm_best_match_decomposition';
import Display from './Display';
import Chatbot from './chatbot';
import DisplayAddedMethod from './DisplayAddedMethod';
import './App.css';

const socket = io('http://localhost:4002', {
  transports: ['websocket', 'polling']
});

// Position calculation constants
const POSITION_CONSTANTS = {
  PARENT_TO_CHATBOT_OFFSET_X: 100,     // Parent → Chatbot X distance
  PARENT_TO_CHATBOT_OFFSET_Y: 0,       // Parent → Chatbot Y offset (0 = same height)
  CHATBOT_NODE_OFFSET_X: 70,           // ChatbotPosition → Chatbot Node X offset
  CHATBOT_NODE_OFFSET_Y: 0,            // ChatbotPosition → Chatbot Node Y offset (0 = same height)
  PLACEHOLDER_OFFSET_X: 100,           // ChatbotPosition → Placeholder X offset
  PLACEHOLDER_OFFSET_Y: 0,             // ChatbotPosition → Placeholder Y offset (0 = same height)
};

function App () {
  const [message, setMessage] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 50, y: 50 });
  const nodesRef = useRef([]);
  // these are constants that pass through each components
  // all components just make changes to these constants
  // and display renders them

  useEffect(() => {
    // Keep nodesRef in sync with nodes state
    nodesRef.current = nodes;
    
   
    if (message?.type === 'confirm_best_match_decomposition' && message?.text?.head?.hash) {
      const headHash = message.text.head.hash;
      const targetNode = nodesRef.current.find(node => node.id.includes(headHash));
      if (targetNode) {
        setChatbotPosition({
          x: targetNode.position.x + POSITION_CONSTANTS.PARENT_TO_CHATBOT_OFFSET_X,
          y: targetNode.position.y + POSITION_CONSTANTS.PARENT_TO_CHATBOT_OFFSET_Y
        });
      }
    }
  }, [message]);

  useEffect(() => {
    socket.on('message', (data) => {
      console.log('Received from server:', data);
      setMessage(data);
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
          // Move nodes that are to the right of chatbot and not the chatbot itself
          if (node.position.x > chatbotPosition.x + 200 && node.id !== 'chatbot-node') {
            if (!movedNodesRef.current.has(node.id)) {
              console.log(`Saving original position of node ${node.id}: ${node.position.x}`);
              movedNodesRef.current.set(node.id, node.position.x); // Save original position
            }
            return {
              ...node,
              position: {
                ...node.position,
                x: node.position.x + 340, // Shift node by chatbot width (340px)
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
      
      // Check if placeholder exists
      const hasPlaceholder = nodes.some(n => n.id === 'chatbot-placeholder');
      const placeholderOffset = hasPlaceholder ? 60 : 0; // 40px placeholder + 20px gap
  
      // Force state update with restored nodes
      const restoredNodes = nodes.map(node => {
        if (movedNodesRef.current.has(node.id)) {
          const originalX = movedNodesRef.current.get(node.id);
          const newX = originalX + placeholderOffset;
          console.log(`Restoring node ${node.id} to x: ${newX} (original: ${originalX}, offset: ${placeholderOffset})`);
          return {
            ...node,
            position: {
              ...node.position,
              x: newX, // Restore with placeholder offset if exists
            },
          };
        }
        return node;
      });
  
      console.log("Restored nodes:", restoredNodes.map(node => ({ id: node.id, x: node.position.x })));
      setNodes(restoredNodes); // Apply restored nodes to state
  
      // Only clear movedNodesRef when placeholder doesn't exist
      if (!hasPlaceholder) {
        setTimeout(() => {
          console.log("Nodes after restoring:", nodes.map(node => ({ id: node.id, x: node.position.x })));
          console.log("Clearing movedNodesRef...");
          movedNodesRef.current.clear(); // Clear the record of moved nodes
          console.log("Moved nodes after clearing:", Array.from(movedNodesRef.current.entries()));
        }, 0); // Check logs after state update
      }
    }
  }, [showChatbot, chatbotPosition]);
  
  // Handle all message types in one effect
  useEffect(() => {
    if (!message) return;
    
    const messageType = message.type;
    console.log('=== App.jsx MESSAGE HANDLER ===');
    console.log('Message type:', messageType);
    console.log('Current showChatbot:', showChatbot);
    console.log('Current nodes count:', nodes.length);
    console.log('Current edges count:', edges.length);
    
    // Messages that should show chatbot
    const showChatbotTypes = [
      'confirm_best_match_decomposition',
      'display_thinking_analysis',
      'show_thinking_analysis_and_decomposition',
      'ask_subtasks',
      'segment_confirmation'
    ];
    
    if (showChatbotTypes.includes(messageType)) {
      console.log('Setting showChatbot to TRUE for message type:', messageType);
      if (messageType === 'ask_subtasks') {
        console.log('!!! ASK_SUBTASKS DETECTED !!!');
        console.log('ask_subtasks text:', message.text);
      }
      setShowChatbot(true);
    } else if (messageType === 'request_user_task') {
      console.log('Clearing all nodes and edges');
      setNodes([]);
      setEdges([]);
    }
  }, [message]);
  
  // This function hide confirm component
  const handleConfirm = () => {
    setMessage(null);
  };
  
  // Monitor nodes state changes
  useEffect(() => {
    console.log("=== NODES STATE UPDATED ===");
    console.log("nodes in app", nodes);
    console.log("Total nodes:", nodes.length);
    console.log("Node IDs:", nodes.map(n => n.id));
  }, [nodes]);

  // Add chatbot node when showChatbot is true
  useEffect(() => {
    if (showChatbot) {
      setNodes(prevNodes => {
        // Keep all placeholders (they are permanent), only replace chatbot-node
        const otherNodes = prevNodes.filter(n => n.id !== 'chatbot-node');
        
        console.log('Adding chatbot at position:', {
          x: chatbotPosition.x + POSITION_CONSTANTS.CHATBOT_NODE_OFFSET_X,
          y: chatbotPosition.y + POSITION_CONSTANTS.CHATBOT_NODE_OFFSET_Y
        });
        console.log('Existing placeholders:', prevNodes.filter(n => n.id.startsWith('placeholder-')).length);
        console.log('Placeholder IDs:', prevNodes.filter(n => n.id.startsWith('placeholder-')).map(n => n.id));
        
        return [
          ...otherNodes,
          {
            id: 'chatbot-node',
            type: 'chatbot',
            position: {
              x: chatbotPosition.x + POSITION_CONSTANTS.CHATBOT_NODE_OFFSET_X,
              y: chatbotPosition.y + POSITION_CONSTANTS.CHATBOT_NODE_OFFSET_Y,
            },
            data: { socket, message },
            draggable: false,
            selectable: false,
            sourcePosition: 'right',
            targetPosition: 'left',
          }
        ];
      });
    }
  }, [showChatbot, message, chatbotPosition]);  

  // Placeholder is now managed by handleConfirm in confirm_best_match_decomposition.jsx
  // Just remove chatbot when showChatbot is false
  useEffect(() => {
    console.log('=== App.jsx SHOWCHATBOT EFFECT ===');
    console.log('showChatbot changed to:', showChatbot);
    console.log('Current nodes count:', nodes.length);
    console.log('Chatbot node exists:', nodes.some(n => n.id === 'chatbot-node'));
    console.log('Placeholder node exists:', nodes.some(n => n.id === 'chatbot-placeholder'));
    
    if (!showChatbot) {
      console.log('Removing chatbot node...');
      setNodes(prev => {
        const filtered = prev.filter(n => n.id !== 'chatbot-node');
        console.log('Nodes after removing chatbot:', filtered.length);
        console.log('Remaining node IDs:', filtered.map(n => n.id));
        return filtered;
      });
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
              readOnly={false}
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
