import { test } from "node:test";
import assert from "node:assert";
import { hello } from "../index.js";

test("hello returns the expected message", () => {
  assert.strictEqual(hello(), "CRDT engine is alive");
});