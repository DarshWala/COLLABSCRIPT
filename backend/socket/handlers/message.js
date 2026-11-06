// Handles: "send-test-message"
// A temporary test handler — will be removed once the real editor is built

export function registerMessageHandlers(socket) {
  socket.on("send-test-message", ({ text }) => {
    const { roomName } = socket.data;

    if (!roomName) {
      socket.emit("room-error", {
        message: "Join a document before sending messages",
      });
      return;
    }

    console.log(`${socket.id} sent a room message to ${roomName}`);
    socket.to(roomName).emit("test-message", {
      from: socket.id,
      text,
    });
  });
}

