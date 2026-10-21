import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Collabscript server is running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server is healthy" });
});

app.post("/echo", (req, res) => {
  console.log(req.body);
  res.json({ received: req.body });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});