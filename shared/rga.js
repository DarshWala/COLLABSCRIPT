// An ID looks like { counter: 3, client: "alice" }

// Turns an ID into a string like "3@alice" so we can use it as a Map key.
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

}