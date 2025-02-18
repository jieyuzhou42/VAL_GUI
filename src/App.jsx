import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import RequestUserTask from './requestUserTask';
import ConfirmBestMatchDecomposition from './confirm_best_match_decomposition';
import EditDecomposition from './EditDecomposition';
import Execution from './Execution';

const socket = io('http://localhost:4002'); // Replace with your server address

function App () {
  // const [message, setMessage] = useState(null);

  // useEffect(() => {
  //   socket.on('message', (data) => {
  //     console.log('Received from server:', data);
  //     setMessage(data);
  //   });

  //   return () => {
  //     socket.off('message');
  //   };
  // }, []);

  // const renderContent = () => {
  //   if (message) {
  //     switch (message.type) {
  //       case 'request_user_task':
  //         return <RequestUserTask data={message}/>;
  //       case 'confirm_best_match_decomposition':
  //         return <ConfirmBestMatchDecomposition data={message}/>;
  //       case 'edit_decomposition':
  //         return <EditDecomposition data={message}/>;
  //     }
  //   }
  //   return null;
  // };

  return (
    <div>
      {/* {renderContent()} */}
      <h1>Execution</h1>
      <Execution/>
    </div>
  );
};

export default App;
