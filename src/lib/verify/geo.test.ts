import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkLocation, distanceM, parseFix } from "./geo";

const kuje = { lat: 8.8796, lng: 7.2276, accuracy: 12 };

test("distance between two points about 1 km apart", () => {
  const d = distanceM(kuje, { lat: kuje.lat + 0.009, lng: kuje.lng });
  assert.ok(Math.abs(d - 1000) < 10, `got ${d}`);
});

test("no fix from the phone is flagged, not passed", () => {
  assert.equal(checkLocation(null, kuje).status, "missing");
});

test("the first precise fix pins the site", () => {
  assert.equal(checkLocation(kuje, null).status, "pinned");
});

test("a rough first fix can't pin the site", () => {
  assert.equal(checkLocation({ ...kuje, accuracy: 900 }, null).status, "review");
});

test("a visit near the pin passes, one across town goes to review", () => {
  assert.equal(checkLocation({ lat: kuje.lat + 0.0005, lng: kuje.lng, accuracy: 15 }, kuje).status, "passed");
  const far = checkLocation({ lat: kuje.lat + 0.05, lng: kuje.lng, accuracy: 15 }, kuje);
  assert.equal(far.status, "review");
  assert.match(far.note, /5\.6 km/);
});

test("junk location input is ignored", () => {
  assert.equal(parseFix({ lat: 91, lng: 0, accuracy: 5 }), null);
  assert.equal(parseFix({ lat: "8", lng: 7, accuracy: 5 }), null);
  assert.deepEqual(parseFix({ lat: 8, lng: 7, accuracy: 5 }), { lat: 8, lng: 7, accuracy: 5 });
});
