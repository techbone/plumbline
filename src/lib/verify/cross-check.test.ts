import { strict as assert } from "node:assert";
import { test } from "node:test";
import { crossCheck, median, MORTAR_FACTOR } from "./cross-check";

test("median handles odd, even and empty", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
});

test("agrees when every block in the wall is found", () => {
  const blocks = Array.from({ length: 100 }, () => 1000);
  const r = crossCheck(blocks, 100 * 1000 * MORTAR_FACTOR);
  assert.equal(r.areaEstimate, 100);
  assert.equal(r.agrees, true);
});

test("flags a wall where SAM missed a fifth of the blocks", () => {
  const found = Array.from({ length: 80 }, () => 1000);
  const r = crossCheck(found, 100 * 1000 * MORTAR_FACTOR);
  assert.equal(r.instanceCount, 80);
  assert.equal(r.areaEstimate, 100);
  assert.equal(r.agrees, false);
});

test("no blocks or no wall never agrees", () => {
  assert.equal(crossCheck([], 5000).agrees, false);
  assert.equal(crossCheck([1000], 0).agrees, false);
});
