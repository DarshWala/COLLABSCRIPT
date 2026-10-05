import { test } from "node:test";
import assert from "node:assert/strict";
import { RGA, idKey } from "../rga.js";

function setupReplicas(clientIds, initialText = "Hi") {
  const replicas = new Map(clientIds.map((clientId) => [clientId, new RGA(clientId)]));
  const writer = replicas.get(clientIds[0]);
  const initialOps = [];

  for (let index = 0; index < initialText.length; index++) {
    initialOps.push(writer.localInsert(index, initialText[index]));
  }

  for (const replica of replicas.values()) {
    if (replica !== writer) initialOps.forEach((op) => replica.apply(op));
  }

  return { replicas, initialOps };
}

function assertSameState(replicas) {
  const [first, ...rest] = replicas;
  const expectedText = first.toString();
  const expectedNodes = first.nodes.map((node) => ({
    id: idKey(node.id),
    value: node.value,
    after: node.after === null ? null : idKey(node.after),
    deleted: node.deleted,
  }));

  for (const replica of rest) {
    assert.equal(replica.toString(), expectedText);
    assert.deepEqual(
      replica.nodes.map((node) => ({
        id: idKey(node.id),
        value: node.value,
        after: node.after === null ? null : idKey(node.after),
        deleted: node.deleted,
      })),
      expectedNodes,
    );
    assert.equal(replica.pending.length, 0);
  }
}

// A repeatable random-number generator: a failed seed can always be replayed.
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function shuffle(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

// Test 2: several characters from each writer compete for one cursor position.
test("long concurrent edits at one position converge", () => {
  const { replicas } = setupReplicas(["alice", "bob"]);
  const alice = replicas.get("alice");
  const bob = replicas.get("bob");

  const aliceOps = [..."ACE"].map((value) => alice.localInsert(2, value));
  const bobOps = [..."BDF"].map((value) => bob.localInsert(2, value));

  // Each side receives the other person's complete run in a different order.
  bobOps.forEach((op) => alice.apply(op));
  [...aliceOps].reverse().forEach((op) => bob.apply(op));

  assertSameState([alice, bob]);
  assert.equal(alice.pending.length, 0);
});

// Test 3: three authors make independent edits, then exchange their operations.
test("three replicas converge after concurrent inserts and a delete", () => {
  const { replicas } = setupReplicas(["alice", "bob", "carol"]);
  const alice = replicas.get("alice");
  const bob = replicas.get("bob");
  const carol = replicas.get("carol");

  const opA = alice.localInsert(1, "A");
  const opB = bob.localInsert(1, "B");
  const opC = carol.localInsert(1, "C");
  const deleteH = alice.localDelete(0);
  const operations = [opA, opB, opC, deleteH];

  // Different delivery order for every replica.
  [opC, opB, deleteH].forEach((op) => alice.apply(op));
  [deleteH, opA, opC].forEach((op) => bob.apply(op));
  [opB, deleteH, opA].forEach((op) => carol.apply(op));

  assertSameState([alice, bob, carol]);
  assert.equal(operations.length, 4); // Keeps the complete concurrent batch explicit.
});

// Test 4: the same valid operation list can arrive in any deterministic order.
test("shuffled delivery orders converge to identical node state", () => {
  const { replicas: authors, initialOps } = setupReplicas(["alice", "bob", "carol"]);
  const alice = authors.get("alice");
  const bob = authors.get("bob");
  const carol = authors.get("carol");
  const operations = [
    ...initialOps,
    alice.localInsert(1, "A"),
    bob.localInsert(2, "B"),
    carol.localInsert(0, "C"),
    alice.localDelete(0),
  ];

  const recipients = [new RGA("recipient-1"), new RGA("recipient-2"), new RGA("recipient-3")];
  recipients.forEach((recipient, index) => {
    shuffle(operations, createRandom(100 + index)).forEach((op) => recipient.apply(op));
  });

  assertSameState(recipients);
});

// Test 5: random edits plus independently shuffled network delivery.
test("seeded fuzz test: replicas converge after random edits and network reordering", () => {
  const seed = 20261005;
  const random = createRandom(seed);
  const clientIds = ["alice", "bob", "carol", "dave"];
  const { replicas: authors, initialOps } = setupReplicas(clientIds, "");
  const operations = [...initialOps];

  // Keep authors synchronized while creating valid user edits. The network chaos is
  // tested afterwards when fresh replicas receive the final operation log.
  for (let step = 0; step < 100; step++) {
    const author = authors.get(clientIds[Math.floor(random() * clientIds.length)]);
    let op;

    if (author.toString().length > 0 && random() < 0.3) {
      op = author.localDelete(Math.floor(random() * author.toString().length));
    } else {
      const index = Math.floor(random() * (author.toString().length + 1));
      const value = String.fromCharCode(97 + Math.floor(random() * 26));
      op = author.localInsert(index, value);
    }

    operations.push(op);
    for (const replica of authors.values()) {
      if (replica !== author) replica.apply(op);
    }
  }

  const recipients = clientIds.map((clientId, index) => new RGA(`replay-${clientId}`));
  recipients.forEach((recipient, index) => {
    shuffle(operations, createRandom(seed + index + 1)).forEach((op) => recipient.apply(op));
  });

  assertSameState(recipients);
});
