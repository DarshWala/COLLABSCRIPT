import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import dns from "dns"
import docRouter from "./routes/docs.js";
import { createServer } from "http";
import { Server } from "socket.io";
import Doc from "./models/Doc.js";


dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();
const app = express();

app.use(cors({ origin: "http://localhost:5173" })); 
app.use(express.json()); // parse JSON bodies
app.use(docRouter)
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const httpServer = createServer(app)


const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
    console.log(`Connection request by ${socket.id}`);
  
  
  console.log(`Socket connected (message from server) : ${socket.id}`);


  // SEND MESSAGE 
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


// JOIN DOCUMENT EVENT
  socket.on("join-document", async ({ documentId }) => {
  console.log(`${socket.id} wants to join document ${documentId}`);
  if (!mongoose.isValidObjectId(documentId)) {
    socket.emit("join-error", {
      message: "Invalid document ID",
    });
    return;
  }
  try {
    const doc = await Doc.findById(documentId).select("_id");
    if (!doc) {
      socket.emit("join-error", {
        message: "Document not found",
      });
      return;
    }
// joining room
    const roomName = `document:${documentId}`;
    await socket.join(roomName);
    socket.data.documentId = documentId;
    socket.data.roomName = roomName;
    console.log(`${socket.id} joined room ${roomName}`);
    socket.emit("joined-document", {
      documentId,
    });
  } catch (error) {
    console.error("Could not validate document:", error);
    socket.emit("join-error", {
      message: "Could not join document",
    });
  }
});
// JOIN DOCUMENT EVENT ENDS
  socket.on("disconnect", () => {
    console.log(`Socket disconnected (message from server): ${socket.id}`);
  });
});



try {
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected ✅");
} catch (err) {
  console.error("Failed to connect to MongoDB:", err);
}

httpServer.listen(PORT , () => {
  console.log(`Server running on Port ${PORT}`);  
})