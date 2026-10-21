import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./db.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT , () => {
  console.log("Server running on port 3000");
  // console.log(process.env.MONGODB_URI); 
})