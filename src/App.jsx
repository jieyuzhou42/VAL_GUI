import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import RequestUserTask from './requestUserTask';
import ConfirmBestMatchDecomposition from './confirm_best_match_decomposition';
import EditDecomposition from './EditDecomposition';
import Display from './Display';

const socket = io('http://localhost:4002'); 
function App () {
  const [message, setMessage] = useState(null);
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

  const handleConfirm = () => {
    // This function hide confirm component
    setMessage(null);
  };
  console.log("nodes in app", nodes);


  return (
    <div>
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
            />
          )}
          {message?.type === 'edit_decomposition' && <EditDecomposition data={message.text} />}
        </>
      )}
    </div>
  );
}

export default App;
