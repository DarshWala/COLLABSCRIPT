import { test } from "node:test";
import assert from "node:assert";
import { RGA } from "../rga.js";

// Two replicas that both already contain "Hi"
function setupHi() {
  const alice = new RGA("alice");
  const bob = new RGA("bob");
  const ops = [alice.localInsert(0, "H"), alice.localInsert(1, "i")];
  ops.forEach((op) => bob.apply(op));
  return { alice, bob, ops };
}

test("local typing builds the text", () => {
  const doc = new RGA("alice");
  doc.localInsert(0, "H");
  doc.localInsert(1, "i");
  doc.localInsert(1, "-");          // insert in the middle
  assert.strictEqual(doc.toString(), "H-i");
});

test("delete hides the character but keeps a tombstone", () => {
  const doc = new RGA("alice");
  doc.localInsert(0, "H");
  doc.localInsert(1, "i");
  doc.localDelete(1);
  assert.strictEqual(doc.toString(), "H");
  assert.strictEqual(doc.nodes.length, 2);   // "i" is still stored
});

test("concurrent inserts at the same spot converge", () => {
  const { alice, bob, ops } = setupHi();
  const opA = alice.localInsert(2, "A");
  const opB = bob.localInsert(2, "B");
  alice.apply(opB);
  bob.apply(opA);
  assert.strictEqual(alice.toString(), "HiBA");
  assert.strictEqual(bob.toString(), "HiBA");
});

test("ops arriving in reverse order still converge", () => {
  const { alice, bob, ops } = setupHi();
  const opA = alice.localInsert(2, "A");
  const opB = bob.localInsert(2, "B");
  const carol = new RGA("carol");
  [...ops, opA, opB].reverse().forEach((op) => carol.apply(op));
  assert.strictEqual(carol.toString(), "HiBA");
});

test("duplicate ops are ignored", () => {
  const { alice, bob } = setupHi();
  const opA = alice.localInsert(2, "A");
  bob.apply(opA);
  bob.apply(opA);
  assert.strictEqual(bob.toString(), "HiA");
});

test("insert after a concurrently deleted character still works", () => {
  const { alice, bob } = setupHi();
  const del = alice.localDelete(1);        // alice deletes "i"
  const ins = bob.localInsert(2, "X");     // bob types X after "i"
  alice.apply(ins);
  bob.apply(del);
  assert.strictEqual(alice.toString(), "HX");
  assert.strictEqual(bob.toString(), "HX");
});

test("a delete that arrives before its insert becomes a tombstone", () => {
  const alice = new RGA("alice");
  const insert = alice.localInsert(0, "A");
  const remove = alice.localDelete(0);

  const bob = new RGA("bob");
  bob.apply(remove); // The network delivers the delete too early.

  assert.strictEqual(bob.pending.length, 1);
  assert.strictEqual(bob.toString(), "");

  bob.apply(insert); // The insert unblocks the waiting delete.

  assert.strictEqual(bob.pending.length, 0);
  assert.strictEqual(bob.nodes.length, 1);
  assert.strictEqual(bob.nodes[0].deleted, true);
  assert.strictEqual(bob.toString(), "");
});
