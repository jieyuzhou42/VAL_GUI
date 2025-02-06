import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import RequestUserTask from './requestUserTask';

const socket = io('http://localhost:4001'); // Replace with your server address

function App () {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    socket.on('message', (data) => {
      console.log('Received from server:', data);
      setMessage(data);
    });

    return () => {
      socket.off('message');
    };
  }, []);

  const renderContent = () => {
    if (message) {
      switch (message.type) {
        case 'request_user_task':
          return <RequestUserTask data={message}/>;
        case 'confirm_best_match_decomposition':
          return <h1>Default</h1>;
      }
    }
    return null;
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
};

export default App;
