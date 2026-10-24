import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import dns from "dns"
import docRouter from "./routes/docs.js";
import { createServer } from "http";
import { Server } from "socket.io";


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
  console.log(`Socket connected (message from server) : ${socket.id}`);

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

