
export function idKey(id) {
  return `${id.counter}@${id.client}`;
}

// Positive if a > b, negative if a < b, 0 if equal.
// Compare counters first; if tied, compare client names (the tie-break).
export function compareIds(a, b) {
  if (a.counter !== b.counter) return a.counter - b.counter;
  if (a.client === b.client) return 0;
  return a.client > b.client ? 1 : -1;
}

export class RGA {
  constructor(clientId) {
    this.clientId = clientId;   
    this.counter = 0;           
    this.nodes = [];           
    this.byId = new Map();      
    this.pending = [];          
  }

    // Characters the user can actually see (skip tombstones)

    //- READING TEXTS AND LOCAL EDITS

  visibleNodes() {
    return this.nodes.filter((n) => !n.deleted);
  }

  toString() {
    return this.visibleNodes().map((n) => n.value).join("");
  }

  // User typed `value` at position `index` (0 = very start)
  localInsert(index, value) {
    const visible = this.visibleNodes();
    if (index < 0 || index > visible.length) {
      throw new RangeError("index out of range");
    }
    const op = {
      type: "insert",
      id: { counter: ++this.counter, client: this.clientId },
      value,
      // the character just before the cursor, or null if at the start
      after: index === 0 ? null : visible[index - 1].id,
    };
    this.apply(op);
    return op; // the caller will send this over the network
  }

  // User deleted the character at position `index`
  localDelete(index) {
    const visible = this.visibleNodes();
    if (index < 0 || index >= visible.length) {
      throw new RangeError("index out of range");
    }
    const op = { type: "delete", target: visible[index].id };
    this.apply(op);
    return op;
  }

    // Entry point for ALL ops, local or remote

    //- INTEGRATING OPS
    
  apply(op) {
    if (this.tryApply(op)) {
      this.flushPending();      // this op may have unblocked waiting ones
    } else {
      this.pending.push(op);    // dependency missing, wait
    }
  }

  // Returns true if applied (or already applied), false if it must wait
  tryApply(op) {
    if (op.type === "insert") return this.integrateInsert(op);
    if (op.type === "delete") return this.integrateDelete(op);
    throw new Error(`Unknown op type: ${op.type}`);
  }

  integrateInsert(op) {
    const key = idKey(op.id);
    if (this.byId.has(key)) return true;   // duplicate: ignore

    // 1. Find where to start looking: right after the anchor
    let pos = 0;
    if (op.after !== null) {
      const anchorKey = idKey(op.after);
      const anchorIndex = this.nodes.findIndex((n) => idKey(n.id) === anchorKey);
      if (anchorIndex === -1) return false; // anchor hasn't arrived yet
      pos = anchorIndex + 1;
    }

    // 2. THE RGA RULE: skip over nodes with a greater ID than ours
    while (pos < this.nodes.length && compareIds(this.nodes[pos].id, op.id) > 0) {
      pos++;
    }

    // 3. Insert here
    const node = { id: op.id, value: op.value, after: op.after, deleted: false };
    this.nodes.splice(pos, 0, node);
    this.byId.set(key, node);

    // Lamport clock rule: never fall behind anything we've seen
    this.counter = Math.max(this.counter, op.id.counter);
    return true;
  }

  integrateDelete(op) {
    const node = this.byId.get(idKey(op.target));
    if (!node) return false;   // the character hasn't arrived yet
    node.deleted = true;       // tombstone: hide, don't remove
    return true;               // deleting twice is harmless
  }

  // Keep retrying waiting ops until nothing more can be applied
  flushPending() {
    let progress = true;
    while (progress) {
      progress = false;
      this.pending = this.pending.filter((op) => {
        if (this.tryApply(op)) {
          progress = true;
          return false;  // applied, drop from pending
        }
        return true;     // still blocked, keep
      });
    }
  }

}