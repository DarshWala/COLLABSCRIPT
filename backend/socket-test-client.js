import { io } from "socket.io-client";
import { RGA } from "../shared/rga.js";

const role = process.argv[2] ?? "receiver";
const text = process.argv.slice(3).join(" ") || "Hello from the sender";
const rga = new RGA(`test-${role}`);

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
    const operation = rga.localInsert(0, "A");

    console.log("[sender] Submitting operation:", operation);

    socket.emit("submit-operation", {
      operation,
    });
  } else {
    console.log("[receiver] Waiting...");
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

socket.on("remote-operation", ({ sequence, operation }) => {
  rga.apply(operation);
  console.log(`[${role}] Received sequence ${sequence}:`, operation);
  console.log(`[${role}] Current RGA text: "${rga.toString()}"`);
  socket.disconnect();
});

socket.on("operation-accepted", ({ operationKey }) => {
  console.log(`[sender] Server accepted: ${operationKey}`);
  socket.disconnect();
});

socket.on("operation-error", ({ message }) => {
  console.error(`[${role}] Operation failed: ${message}`);
  socket.disconnect();
});