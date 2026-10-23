import { Router} from "express"
import Doc from "../models/Doc.js"
import mongoose from "mongoose"

const router = Router()

router.param("id", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  next();
});

router.post("/" , async (req , res) => {
  const d = await Doc.create({title : req.body.title})
  console.log(req.body.title);  
  res.status(201).json(d)
});

router.get("/" , async (req , res) => {
  const docs = await Doc.find().sort({updatedAt : -1});
  res.json(docs)
});

router.get("/:id" , async (req , res) => {
  const d = await Doc.findById(req.params.id)
  if(!d) return res.status(404).json({message : "Error! Doc not found"})
  res.json(d)

})

router.patch("/:id", async (req, res) => {
  const doc = await Doc.findByIdAndUpdate(
    req.params.id,
    { title: req.body.title },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.delete("/:id", async (req, res) => {
  const doc = await Doc.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router