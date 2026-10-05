import { RGA } from "./rga.js";

const alice = new RGA("alice");
const bob = new RGA("bob");

const h = alice.localInsert(0, "H");
const i = alice.localInsert(1, "i");
bob.apply(h);
bob.apply(i);

const opA = alice.localInsert(2, "A");   // typed at the same time...
const opB = bob.localInsert(2, "B");     // ...at the same spot

console.log("before sync -> alice:", alice.toString(), "| bob:", bob.toString());

alice.apply(opB);                        // ops cross in opposite orders
bob.apply(opA);

console.log("after sync  -> alice:", alice.toString(), "| bob:", bob.toString());