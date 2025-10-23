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
function App () {
  const [message, setMessage] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 50, y: 50 });
  const [lastMessageType, setLastMessageType] = useState(null); // Track previous message type for placeholder
  const nodesRef = useRef([]);
  // these are constants that pass through each components
  // all components just make changes to these constants
  // and display renders them

  useEffect(() => {
    // Keep nodesRef in sync with nodes state
    nodesRef.current = nodes;
    
    // Update chatbot position when message changes
    if (message?.type === 'confirm_best_match_decomposition' && message?.text?.head?.hash) {
      const headHash = message.text.head.hash;
      const targetNode = nodesRef.current.find(node => node.id.includes(headHash));
      if (targetNode) {
        setChatbotPosition({
          x: targetNode.position.x + 200, // Increased to 200 for better spacing
          y: targetNode.position.y
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
    
    // Messages that should show chatbot
    const showChatbotTypes = [
      'confirm_best_match_decomposition',
      'display_thinking_analysis',
      'show_thinking_analysis_and_decomposition',
      'ask_subtasks',
      'segment_confirmation'
    ];
    
    // Messages that should show placeholder when chatbot is hidden
    const placeholderTypes = [
      'confirm_best_match_decomposition',
      'display_added_method'
    ];
    
    if (showChatbotTypes.includes(messageType)) {
      setShowChatbot(true);
      if (placeholderTypes.includes(messageType)) {
        setLastMessageType(messageType); // Remember for placeholder
      }
    } else if (messageType === 'display_added_method') {
      setShowChatbot(false); // Hide chatbot, show placeholder
      setLastMessageType(messageType);
    } else if (messageType === 'request_user_task') {
      setNodes([]);
      setEdges([]);
      setLastMessageType(null); // Clear placeholder context
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
        const otherNodes = prevNodes.filter(n => n.id !== 'chatbot-node' && n.id !== 'chatbot-placeholder');
        
        // Calculate vertical center: align chatbot with middle of parent and subtasks
        // Assuming subtasks span from parent.y to parent.y + (n-1)*50
        // For now, use a reasonable offset that centers the chatbot window
        const chatbotWindowHeight = 500; // From chat.css
        const verticalOffset = chatbotWindowHeight / 2; // Center of chatbot window
        
        return [
          ...otherNodes,
          {
            id: 'chatbot-node',
            type: 'chatbot',
            position: {
              x: chatbotPosition.x + 100,
              y: chatbotPosition.y - verticalOffset + 16, // Align center of chatbot with parent/subtasks middle
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

  // Remove chatbot and add placeholder when showChatbot becomes false
  useEffect(() => {
    const shouldShowPlaceholder = !showChatbot && 
      (lastMessageType === 'confirm_best_match_decomposition' || lastMessageType === 'display_added_method');
    
    if (shouldShowPlaceholder) {
      setNodes(prev => {
        const filtered = prev.filter(n => n.id !== 'chatbot-node');
        // Add placeholder if it doesn't exist
        if (!filtered.some(n => n.id === 'chatbot-placeholder')) {
          return [
            ...filtered,
            {
              id: 'chatbot-placeholder',
              position: {
                x: chatbotPosition.x + 100,
                y: chatbotPosition.y + 5, // Slightly offset for better visual alignment
              },
              data: { label: '···' },
              style: {
                background: 'rgb(236, 243, 254)',
                border: 'none',
                borderRadius: '8px',
                width: '40px',
                height: '32px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '16px',
                color: '#666',
                padding: '0',
              },
              sourcePosition: 'right',
              targetPosition: 'left',
            }
          ];
        }
        return filtered;
      });
    } else if (!showChatbot) {
      // If not showing placeholder, remove both chatbot and placeholder
      setNodes(prev => prev.filter(n => n.id !== 'chatbot-node' && n.id !== 'chatbot-placeholder'));
    }
  }, [showChatbot, lastMessageType, chatbotPosition]);

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
