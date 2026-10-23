import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import dns from "dns"
import Doc from "./models/doc.js";
// import connectDB from "./db.js";


dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config();

const app = express();
app.use(express.json()); // parse JSON bodies
const PORT = process.env.PORT || 5000;
// connectDB()
const MONGODB_URI = process.env.MONGODB_URI;



try {
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected ✅");
} catch (err) {
  console.error("Failed to connect to MongoDB:", err);
}

app.listen(PORT , () => {
  console.log("Server running on port 5000");
  // console.log(process.env.MONGODB_URI);

})

app.post("/test-doc", async (req, res) => {
  const doc = await Doc.create({ title: req.body.title });
  res.json(doc);
}); 