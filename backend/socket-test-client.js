import { io } from "socket.io-client";

const role = process.argv[2] ?? "receiver";
const text = process.argv.slice(3).join(" ") || "Hello from the sender";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log(`[${role}] Connected: ${socket.id}`);

  socket.emit("join-document", {
    documentId: "6adc82c9e50300b27ae1a752",
  });
});

socket.on("joined-document", ({ documentId }) => {
  console.log(`[${role}] Joined document: ${documentId}`);

  if (role === "sender") {
    console.log(`[sender] Sending: ${text}`);

    socket.emit("send-test-message", {
      text,
    });

    setTimeout(() => {
      socket.disconnect();
    }, 1000);
  } else {
    console.log("[receiver] Waiting for a room message...");
  }
});

socket.on("test-message", ({ from, text }) => {
  console.log(`[receiver] Received from ${from}: ${text}`);
  socket.disconnect();
});

socket.on("room-error", ({ message }) => {
  console.error(`[${role}] Room error: ${message}`);
  socket.disconnect();
});

socket.on("join-error", ({ message }) => {
  console.error(`[${role}] Join failed: ${message}`);
  socket.disconnect();
});

socket.on("disconnect", (reason) => {
  console.log(`[${role}] Disconnected: ${reason}`);
  process.exit(0);
});

socket.on("connect_error", (error) => {
  console.error(`[${role}] Connection failed: ${error.message}`);
  process.exit(1);
});