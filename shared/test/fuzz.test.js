import { test } from "node:test";
import assert from "node:assert";
import { RGA, idKey } from "../rga.js";

// ---------- Seeded random numbers (repeatable "randomness") ----------
function makeRng(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random whole number from 0 to n-1
function randInt(rng, n) {
  return Math.floor(rng() * n);
}

// ---------- One full simulated session ----------
function runSimulation(seed, { numClients = 3, steps = 300 } = {}) {
  const rng = makeRng(seed);

  // Create the replicas (the "users")
  const replicas = [];
  for (let i = 0; i < numClients; i++) {
    replicas.push(new RGA(`client${i}`));
  }

  // inboxes[i] = messages travelling towards replica i, not yet delivered
  const inboxes = replicas.map(() => []);

  // partitioned[i] = true means replica i is currently cut off (receives nothing)
  const partitioned = new Array(numClients).fill(false);

  // Send an op to everyone except the sender. Sometimes send it twice.
  function broadcast(op, from) {
    for (let i = 0; i < numClients; i++) {
      if (i === from) continue;
      inboxes[i].push(structuredClone(op)); // a copy, like a real network message
      if (rng() < 0.1) inboxes[i].push(structuredClone(op)); // duplicate delivery
    }
  }

  // Deliver ONE random message from replica i's inbox
  function deliverOne(i) {
    const inbox = inboxes[i];
    if (inbox.length === 0) return;
    const pos = randInt(rng, inbox.length); // random pick = reordering
    const [op] = inbox.splice(pos, 1);      // remove it from the inbox
    replicas[i].apply(op);
  }

  // ----- The random session -----
  for (let step = 0; step < steps; step++) {
    // 5% of steps: cut off or reconnect a random replica
    if (rng() < 0.05) {
      const p = randInt(rng, numClients);
      partitioned[p] = !partitioned[p];
    }

    const who = randInt(rng, numClients);
    const replica = replicas[who];
    const roll = rng();

    if (roll < 0.5) {
      // Local insert at a random position
      const index = randInt(rng, replica.toString().length + 1);
      const char = "abcdefghij"[randInt(rng, 10)];
      broadcast(replica.localInsert(index, char), who);
    } else if (roll < 0.65) {
      // Local delete of a random character (only if there is one)
      const length = replica.toString().length;
      if (length > 0) {
        broadcast(replica.localDelete(randInt(rng, length)), who);
      }
    } else if (!partitioned[who]) {
      // Network delivers one message to this replica
      deliverOne(who);
    }
  }

  // ----- Heal the network: deliver everything still in transit -----
  for (let i = 0; i < numClients; i++) {
    while (inboxes[i].length > 0) deliverOne(i);
  }

  // ----- Check convergence -----
  const snapshot = (r) => ({
    text: r.toString(),
    // every node's ID in order, with "x" marking tombstones
    order: r.nodes.map((n) => idKey(n.id) + (n.deleted ? "x" : "")).join(","),
    pending: r.pending.length,
  });

  const first = snapshot(replicas[0]);
  assert.strictEqual(first.pending, 0, `seed ${seed}: replica 0 has stuck ops`);

  for (let i = 1; i < numClients; i++) {
    const s = snapshot(replicas[i]);
    assert.strictEqual(s.pending, 0, `seed ${seed}: replica ${i} has stuck ops`);
    assert.strictEqual(s.text, first.text, `seed ${seed}: text differs on replica ${i}`);
    assert.strictEqual(s.order, first.order, `seed ${seed}: internal order differs on replica ${i}`);
  }
}

test("fuzz: all replicas converge", () => {
  for (let seed = 1; seed <= 200; seed++) {
    runSimulation(seed, { numClients: 2 + (seed % 4) }); // 2 to 5 clients
  }
});