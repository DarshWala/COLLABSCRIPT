import { Router} from "express"
import doc from "../models/doc"
import mongoose from "mongoose"

const router = Router()

router.param("id", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  next();
});



export default router