import mongoose from "mongoose";

const docSchema = new mongoose.Schema(
    {title : {type : String , default : "Untitled"}},
    {timestamps: true}
);

export default mongoose.model("Doc", docSchema);