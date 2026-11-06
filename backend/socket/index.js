import { registerMessageHandlers } from "./handlers/message.js";
import { registerDocumentHandlers } from "./handlers/document.js";
import { registerOperationHandlers } from "./handlers/operation.js";

// Called once from server.js with the Socket.IO server instance.
// Registers the "connection" listener and wires up all per-socket handlers.

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    registerMessageHandlers(socket);
    registerDocumentHandlers(socket);
    registerOperationHandlers(socket);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

