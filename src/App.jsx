import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import RequestUserTask from './requestUserTask';
import ConfirmBestMatchDecomposition from './confirm_best_match_decomposition';
import EditDecomposition from './EditDecomposition';
import Display from './Display';
import Chatbot from './chatbot';

const socket = io('http://localhost:4002'); 
function App () {
  const [message, setMessage] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  // these are constants that pass through each components
  // all components just make changes to these constants
  // and display renders them

  useEffect(() => {
    socket.on('message', (data) => {
      console.log('Received from server:', data);
      setMessage(data);
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
  
  // This function hide confirm component
  const handleConfirm = () => {
    setMessage(null);
  };
  console.log("nodes in app", nodes);


  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
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
              setShowChatbot={setShowChatbot}
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

      {showChatbot && (
      <div
        style={{
          position: 'absolute',
          top: 50,
          right: 50,
          zIndex: 9999, // ensures it's above the flow
        }}
      >
        <Chatbot socket={socket} />
      </div>
    )}
  </div>
  );
}

export default App;
