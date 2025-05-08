import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4002");

function RequestUserTask ({ data }){
  const [input, setInput] = useState("");

  const sendMessage = () => {
    //clear the local
    localStorage.clear();
    socket.emit('message', {type:"confirm_response", response: input});
    setInput("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>VAL</h2>
      <p>{data}</p>
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
  
