import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4002");

function RequestUserTask ({ data }){
  const [input, setInput] = useState("");

  const sendMessage = () => {
    socket.emit('message', {'response': input});
    setInput("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>VAL</h2>
      <p>{data.text}</p>
      <div>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Type a task..." 
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default RequestUserTask;
  
