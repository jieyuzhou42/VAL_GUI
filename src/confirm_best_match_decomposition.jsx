import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4001");

function Request_user_task() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    useEffect(() => {
        socket.on("message", (data) => {
            console.log("Received from server:", data);
            setMessages(data || []);  // Store received messages
        });

        return () => {
            socket.off("message");
        };
    }, []);

    const sendMessage = () => {
        socket.emit("message", { message: input });
        setInput("");
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>VAL</h2>
            <div>
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    placeholder="Type a task..." 
                />
                <button onClick={sendMessage}>Send</button>
            </div>

            <h3>Received Messages:</h3>
            <pre>{JSON.stringify(messages, null, 2)}</pre>
        </div>
    );
}

export default Request_user_task;

