# Build log

Dead ends, surprises from the Meta API, the path chosen, and the test that guards it.

## 2026-10-29 — SAM video tracks at most 16 objects per frame

- **Surprise:** the SAM 3.1 docs cap video tracking at 16 objects per frame. A single wall face has hundreds of blocks.
- **Path chosen:** count walls from guided elevation stills in image mode (no published instance cap), and use video tracking only for sparse objects: columns, openings, block stacks.
- **Guard:** `docs/evidence/spike/*.json`, SAM instance counts on four real fence photos.

## 2026-10-29 — Muse Voice Transcribe has no Nigerian languages

- **Surprise:** the 25 supported languages don't include Yoruba, Hausa, Igbo or Pidgin.
- **Path chosen:** the spoken visit code is English only; we don't pitch narration translation.

## 2026-10-29 — SAM spike on a real block wall: individual blocks separate, with two failure modes

- **Result:** prompt `"concrete block"` on an unpainted staggered-bond fence gives one mask per block face, including partial blocks at the edges. Close-up (34 masks): every visible face masked, 34 of 34. Front (92 masks) and shade (57) are mostly clean, but not complete. Cost is about $0.001 per image.
- **Failure 1, undercount:** SAM skips some blocks that look different from their neighbours. In the front shot about six cool-grey blocks have no mask. In the shade shot the whole stained bottom course (about 6 blocks) is missing. In the angle shot most of the shaded left bay is missing.
- **Failure 2, perspective:** on the angled shot the median block area means little because near and far blocks differ in size, so the area cross-check disagrees by 35%. Elevation stills must be shot straight on.
- **Cross-check:** it flags all four photos (17–35% off, tolerance is 12%). That is correct for the shade photo (undercount) and the angle photo. For the front photo it is probably too strict: `MORTAR_FACTOR = 1.08` assumes 10–12 mm joints, but this wall has 20+ mm joints, and SAM masks sit slightly inside the block edge.
- **Next:** calibrate the factor on a hand-counted wall, add a straight-on check (reject when the wall's top edge isn't level), and prompt SAM a second time for the "dark/grey block" case.
- **Counting rule (used for every hand count):** one count per block face at least half visible, including cut and partial blocks at edges and pillars. Exclude the buried or stained foundation course and anything behind grass.
- **Fixed on the way:** the overlay `viewBox` was `0 0 0 0` because the size regex required `|>` right after `h=`, and `include_confidence` adds a field there.

## 2026-10-29 — SAM video tracking on a 31 s walkthrough: works, but not for counting

- **Setup:** 31.7 s phone clip (about 60 fps, 1,900 frames), shrunk to 29 MB and uploaded through the Files API. Raw results in `docs/evidence/spike/fence-walk.*.json`.
- **Blocks:** `"concrete block"` returns 16 tracks, peak 16 per frame: the documented cap. Identities last 170 to 360 frames each. Took 257 s.
- **Pillars:** `"concrete pillar"` and `"wall pillar"` return 0 tracks on video. `"vertical concrete column"` returns 5 tracks (peak 2 per frame) for what looks like about 3 pillars in the clip, so identities are not clean enough to count from. That run took 1,834 s.
- **Phrasing is fragile on stills too:** on the front photo `"concrete pillar"`, `"pillar"` and `"column"` find 0; `"wall pillar"` finds 2 and `"vertical concrete column"` finds 3.
- **Openings are solid:** on one walkthrough frame, `"hollow block opening"`, `"ventilation opening"` and `"hole in wall"` each return 8, matching the 8 vent blocks in the frame.
- **Cost:** about 1,900 frames per prompt, so about $0.38 per video run, against $0.0025 per still.
- **Path chosen:** every count that gates a milestone runs in image mode on stills and walkthrough keyframes. Video tracking becomes an optional precomputed continuity view for the demo.
- **Guard:** `docs/evidence/spike/*.video.json` and the per-frame opening test (to be added as a unit-level eval when the pipeline exists).
- **Tooling note:** `ffmpeg-static` downloaded slowly (about 10 minutes); macOS `avconvert` was a fast fallback for shrinking the clip locally.

## 2026-10-29 — Walk-along count: keyframes + SAM image mode + our own stitching

- **Why:** SAM video tracking locks onto the first 16 objects (all 16 tracks in the fence walk start at frame 0), so it can't count a wall you walk along.
- **What we built:** `src/lib/verify/stitch.ts`. Keyframes at 2 fps, SAM `"concrete block"` on each (63 calls, 90 s, about $0.16), sideways shift between neighbouring keyframes by brute-force image matching on 135 px grey frames, then every block placed on one shared wall map and merged. Boxes cut off at the frame's side edges are skipped because the block appears whole in a neighbour frame.
- **Result on the 31 s fence walk:** 237 unique blocks, 13 of them seen in only one keyframe. The panorama lines up: courses stay level across 63 frames and nearly every block carries one number.
- **Errors seen by eye:** a few small spurious sightings in mortar gaps and grass (23, 49, 55, 187, 204, 210, 212) and a few doubled labels where two sightings landed side by side (156/52, 213/235, 221/234). Nearly all are in the "seen once" group. A few cool-grey blocks near the vent are still missed. My eyeball estimate puts the true count within about 5% of 237. No hand count of the full walk exists yet.
- **Path chosen:** report "confirmed" (seen in 2+ keyframes) separately from "needs review" (seen once). The walk-along becomes the main capture; straight-on stills stay as a fallback.
- **Guard:** `stitch.test.ts` (shift recovery on a synthetic texture, edge-box skip, same-frame boxes never merge) and `docs/evidence/walk/fence-walk.540.json`.
