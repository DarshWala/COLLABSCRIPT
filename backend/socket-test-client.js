import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log(`Connected with socket ID: ${socket.id}`);

  setTimeout(() => {
    socket.disconnect();
  }, 1000);
});

socket.on("disconnect", (reason) => {
  console.log(`Disconnected: ${reason}`);
  process.exit(0);
});

socket.on("connect_error", (error) => {
  console.error(`Connection failed: ${error.message}`);
  process.exit(1);
});