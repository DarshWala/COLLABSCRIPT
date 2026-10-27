import mongoose from "mongoose";

const operationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doc",
      required: true,
      index: true,
    },

    sequence: {
      type: Number,
      required: true,
      min: 1,
    },

    operationKey: {
      type: String,
      required: true,
    },

    operation: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One logical operation must be stored only once per document.
operationSchema.index(
  { documentId: 1, operationKey: 1 },
  { unique: true }
);

// Each document gets one unambiguous replay order.
operationSchema.index(
  { documentId: 1, sequence: 1 },
  { unique: true }
);

export default mongoose.model("Operation", operationSchema);