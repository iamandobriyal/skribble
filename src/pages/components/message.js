import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const socket = io("http://localhost:5000");

  useEffect(() => {
    const handleNewMessage = (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="messages">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`message ${
            message.text === "Answered correctly!" ? "green" : ""
          }`}
        >
         <b>{message.name}: </b> {message.text}
        </div>
      ))}

      <div ref={messagesEndRef}></div>
      <style jsx>
        {`
          .messages {
            min-height: 74vh;
            max-height: 74vh;
            max-width: 250px;
            background-color: white;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 5px;
          }
          .message {
            display: flex;
            column-gap: 5px;
            align-items: center;
            padding-left: 10px;
            height: 30px;
            font-size: 14px;
            max-width: 250px;
            word-wrap: break-word;
          }
          .green{
            color:green;
          }
        `}
      </style>
    </div>
  );
};

export default Messages;
