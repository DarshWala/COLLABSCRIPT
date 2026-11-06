import Operation from "../../models/Operation.js";
import { idKey } from "../../../shared/rga.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

// Builds the unique string key that identifies an operation.
// insert:1@alice  or  delete:3@bob
function getOperationKey(operation) {
  if (operation.type === "insert") {
    return `insert:${idKey(operation.id)}`;
  }
  if (operation.type === "delete") {
    return `delete:${idKey(operation.target)}`;
  }
  return null;
}

// Checks that an RGA id object has the right shape: { counter: number, client: string }
function isValidId(id) {
  return (
    id &&
    typeof id === "object" &&
    Number.isInteger(id.counter) &&
    id.counter > 0 &&
    typeof id.client === "string" &&
    id.client.length > 0
  );
}

// Checks that a full RGA operation is well-formed before we touch the DB
function isValidOperation(operation) {
  if (!operation || typeof operation !== "object") return false;

  if (operation.type === "insert") {
    return (
      isValidId(operation.id) &&
      typeof operation.value === "string" &&
      operation.value.length > 0 &&
      (operation.after === null || isValidId(operation.after))
    );
  }

  if (operation.type === "delete") {
    return isValidId(operation.target);
  }

  return false;
}

// ─── Handler ────────────────────────────────────────────────────────────────

// Handles: "submit-operation"
// Validates, deduplicates, persists, then broadcasts to everyone else in the room.

export function registerOperationHandlers(socket) {
  socket.on("submit-operation", async ({ operation } = {}) => {
    const { documentId, roomName } = socket.data;

    // Must be in a room first
    if (!documentId || !roomName) {
      socket.emit("operation-error", {
        message: "Join a document before submitting operations",
      });
      return;
    }

    // Validate the op shape
    if (!isValidOperation(operation)) {
      socket.emit("operation-error", {
        message: "Invalid CRDT operation",
      });
      return;
    }

    const operationKey = getOperationKey(operation);

    try {
      // Deduplication check: if this exact op already exists, just confirm it
      const existingOperation = await Operation.findOne({
        documentId,
        operationKey,
      }).select("sequence");

      if (existingOperation) {
        socket.emit("operation-accepted", {
          operationKey,
          sequence: existingOperation.sequence,
          duplicate: true,
        });
        return;
      }

      // Sequence = count of existing ops + 1
      // Always stays in sync with actual DB — no drift if ops are cleared
      const count = await Operation.countDocuments({ documentId });
      const sequence = count + 1;

      const savedOperation = await Operation.create({
        documentId,
        sequence,
        operationKey,
        operation,
      });

      console.log(
        `${socket.id} saved ${operationKey} as sequence ${savedOperation.sequence}`
      );

      // Broadcast to every OTHER client in the same room
      socket.to(roomName).emit("remote-operation", {
        sequence: savedOperation.sequence,
        operation: savedOperation.operation,
      });

      // Confirm back to the sender
      socket.emit("operation-accepted", {
        operationKey,
        sequence: savedOperation.sequence,
        duplicate: false,
      });
    } catch (error) {
      // 11000 = MongoDB duplicate key — race condition hit the unique index
      // Safe to treat as a duplicate: find the winner and confirm it
      if (error?.code === 11000) {
        const existingOperation = await Operation.findOne({
          documentId,
          operationKey,
        }).select("sequence");

        socket.emit("operation-accepted", {
          operationKey,
          sequence: existingOperation.sequence,
          duplicate: true,
        });
        return;
      }

      console.error("Could not save operation:", error);
      socket.emit("operation-error", {
        message: "Could not save operation",
      });
    }
  });
}

