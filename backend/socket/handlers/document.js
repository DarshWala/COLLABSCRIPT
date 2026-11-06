import mongoose from "mongoose";
import Doc from "../../models/Doc.js";
import Operation from "../../models/Operation.js";

// Handles: "join-document"
// Validates the document exists, joins the socket room,
// then sends back the full op history so the client can catch up.

export function registerDocumentHandlers(socket) {
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

      // Join the socket.io room for this document
      const roomName = `document:${documentId}`;
      await socket.join(roomName);
      socket.data.documentId = documentId;
      socket.data.roomName = roomName;
      console.log(`${socket.id} joined room ${roomName}`);

      // Send full op history so client can replay to current state
      const history = await Operation.find({ documentId })
        .sort({ sequence: 1 })
        .select("sequence operation -_id")
        .lean();

      socket.emit("document-history", { operations: history });
      socket.emit("joined-document", { documentId });
    } catch (error) {
      console.error("Could not validate document:", error);
      socket.emit("join-error", {
        message: "Could not join document",
      });
    }
  });
}

