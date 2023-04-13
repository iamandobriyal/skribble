const http = require("http");
const socketIO = require("socket.io");

// Create an HTTP server to use with socket.io
const httpServer = http.createServer();

// Initialize socket.io with the HTTP server
const io = socketIO(httpServer, {
  cors: {
    origin: "*",
  },
});

// Listen for socket.io connections
io.on("connection", (socket) => {
  console.log(`User ${socket.id} connected`);

  // Listen for the "draw" event from the client
  socket.on("draw", (data) => {
    console.log(`User ${socket.id} is drawing:`, data);

    // Broadcast the "draw" event to all other connected clients
    socket.broadcast.emit("draw", data);
  });

  socket.on("clearCanvas", () => {
    socket.broadcast.emit("clearCanvas");
  });

  // Listen for the 'sendMessage' event from the client
  socket.on(
    "sendMessage",
    (message) => {
      // Find the player's name from the gameData object
      console.log(`User ${socket.id} is sending a message:`, message);
      socket.broadcast.emit("newMessage", message);

    }
  );

  // Listen for socket.io disconnections
  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
  });
});

// Start the HTTP server on port 5000
httpServer.listen(5000, () => {
  console.log("Socket.io server running on port 5000");
});
