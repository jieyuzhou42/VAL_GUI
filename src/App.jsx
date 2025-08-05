import React, { useEffect, useState } from 'react';
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

      // ✅ 위치 정보가 있으면 모든 메시지에 대해 chatbot 위치 업데이트
      if (data?.position) {
        setChatbotPosition(data.position);
      }
    });
    return () => {
      socket.off('message');
    };
  }, []);

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
              y: chatbotPosition.y + 25, // 👈 change here
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

      {/* {showChatbot && (
      <div
        style={{
          position: 'absolute',
          top: 50,
          right: 50,
          zIndex: 9999, // ensures it's above the flow
        }}
      >
        <Chatbot socket={socket} message={message}/>
      </div>
    )} */}
  </div>
  );
}

export default App;
