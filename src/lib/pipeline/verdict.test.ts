import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { CodeCheck } from "./liveness";
import { decide } from "./verdict";

const code = (status: CodeCheck["status"]): CodeCheck => ({ status, read: "K74Q", frame: 1, matched: 4, note: "note" });

test("no code on camera means not verified, however many blocks", () => {
  assert.equal(decide(code("failed"), 5000, 0, 230).status, "not_verified");
});

test("confirmed count at or over target with a good code is verified", () => {
  assert.equal(decide(code("passed"), 230, 4, 230).status, "verified");
});

test("target reachable only with seen-once blocks goes to review", () => {
  assert.equal(decide(code("passed"), 224, 13, 230).status, "review");
});

test("below target even counting seen-once blocks is short", () => {
  const v = decide(code("passed"), 150, 10, 230);
  assert.equal(v.status, "short");
  assert.match(v.reasons.join(), /70 blocks short/);
});

test("a one-character code mismatch can't be verified, only reviewed", () => {
  assert.equal(decide(code("review"), 300, 0, 230).status, "review");
});

test("a held check (location, same site) turns verified into review", () => {
  const v = decide(code("passed"), 240, 3, 230, ["Filmed 5.6 km from the site pin"]);
  assert.equal(v.status, "review");
  assert.match(v.reasons.join(), /5\.6 km/);
});

test("a hold doesn't soften a short count or a missing code", () => {
  assert.equal(decide(code("passed"), 100, 0, 230, ["x"]).status, "short");
  assert.equal(decide(code("failed"), 300, 0, 230, ["x"]).status, "not_verified");
});
