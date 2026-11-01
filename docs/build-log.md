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

## 2026-10-29 — Vercel free plan: no database, no video upload, stills from the phone

- **Constraint:** Vercel functions take about 4.5 MB per request and have no lasting disk; a phone walk is 30 to 94 MB. Fly.io wasn't available (free trial expired).
- **Path chosen:** the phone cuts a still every half second and sends each as its own request. The server stores the frame (Vercel Blob), counts blocks with SAM, and returns the count, so counting runs live. The visit is a signed ticket (HMAC), so there's no database. `/finish` reads the stored frames and counts back, decodes small grey copies in pure JS (`jpeg-js`), stitches, reads the visit code with Muse Spark, and writes the report.
- **Measured:** 31.7 s walk = 63 frames = 9.3 MB, against 29 MB for the 540p video and 94 MB as recorded. End to end through the HTTP API: 115 s, 225 confirmed, 15 to check.
- **Wrong estimate corrected:** I first said about 4 MB; the real figure is 9.3 MB (about 148 KB a frame).
- **Self-inflicted bug:** adding `VISIT_SECRET` to `.env.local` mid-run changed the signing key and later frames got `401 Invalid visit ticket`. Not a code bug; rerunning after a restart passed.
- **Guard:** `scripts/e2e.ts` (same HTTP calls as the phone), `docs/evidence/e2e/`, `verdict.test.ts`.

## 2026-10-30 — First real phone walks on the deployed app

- **Walk 1 (`vis_60c648d2e671`):** the handwritten code "G3QH" was read as "G3PH" (the Q had a vertical stroke). One character off gave "needs a check", as designed. 68 frames, 16.9 MB.
- **Walk 2 (`vis_62077ef1a92a`):** code "74RV" read correctly, 88 frames, 24.4 MB, 245 confirmed and 35 to check, verified against the 230 target.
- **Surprise:** the walk began with a close-up of the code block and the foreman stepping back. Blocks in those frames were drawn 2 to 6 times bigger (median height 309 px falling to about 56 px), and since stitching assumes a pure sideways slide, they landed on the wall map at the wrong scale and counted blocks twice.
- **Fix:** `steadyFrames` keeps only frames whose median block height is within 1.35x of the walk's typical height. Replaying walk 2 locally (`npm run replay`; SAM gave identical boxes to production) gives 239 confirmed and 29 to check, so 12 double counts were removed. 62 of 88 frames were used.
- **Also seen:** frames are about 280 KB each on rough concrete, against 148 KB on the fence test clip, so a 44 s walk is 24 MB. A few loose stones on the ground were picked up as blocks, mostly in the seen-once group.
- **Camera on iOS Safari:** `object-fit: cover` wasn't applied to the live stream, so the preview was a small picture in a black frame. It's now sized by hand every frame and hidden until measured. The camera restarts when the tab comes back, and a walk that's interrupted by leaving the tab ends with the frames already sent.
- **Guard:** `stitch.test.ts` (close-up frames dropped).

## 2026-10-30 — Location, same-site check, site notes, test sites

- **Third phone walk (`vis_77d1c43227e3`):** code "VRKE" read, 117 stills (94 kept by the close-up filter), 236 confirmed and 21 seen once, verified. 31.5 MB.
- **Location:** the phone watches GPS from "Start visit" and sends its best fix with `/finish`. The first visit with a fix of ±150 m or better and a readable code pins the site; later visits more than 150 m (plus both fixes' accuracy) from the pin, or with no fix, are held for review. Reports show the distance, never coordinates. Guard: `geo.test.ts`, `verdict.test.ts`.
- **Muse Spark same-site check:** one mid-walk frame from this visit and the last one. On two runs of the test clip it answered "same", naming the cell mast, rooftops, tree line, stains and vent holes. A "different" answer holds the visit.
- **Muse Spark site notes:** four frames spread along the walk give a stage, up to four observations tied to frame numbers, and a summary. The first run called the drainage vents "open holes at the base"; the prompt now says regular low openings are usually vents. Notes never change the verdict.
- **Small bug caught in e2e:** a visit whose code wasn't read said "this spot is now the site pin" but correctly didn't write the pin. The note now says it couldn't pin.
- **Code alphabet:** Q dropped after it was read as P on a real walk.
- **SAM isn't perfectly repeatable:** re-running SAM on the 117 stills of `vis_77d1c43227e3` gave 235 confirmed / 22 seen once against production's 236 / 21 (same 257 blocks in total). On the 88 stills of `vis_62077ef1a92a` a re-run matched production exactly. Reports store their own numbers and are never recomputed.
- **Home page replay:** `npm run showcase` turns a stored visit into 59 small stills (1.26 MB) with SAM's boxes and the running count; the receipt quotes the production report.

## 2026-11-01 — Vercel Blob hit its free cap, storage moved to Cloudflare R2

- **Surprise:** Vercel Blob's free tier allows 2,000 "advanced operations" a month, and `list()` counts as one just like a write. Our read path called `list()` before every fetch, so one walk cost about 500 operations (a write for each still and each count, plus a list for each read when the report is built). A few walks and a day of page views used the cap, and the store was paused for 30 days. Every report and the owner pages returned 404.
- **Decision:** moved the write-once store to Cloudflare R2 (S3 API; 10 GB free, no egress fees, 1M writes and 10M reads a month). Reads now go straight to the key with no list; only the site history lists. `src/lib/storage.ts` is still the single file that knows about the store, and the write-once rule is enforced by the store with `If-None-Match: *`.

## 2026-11-01 — Smaller stills: JPEG quality 0.82 → 0.75

- **Why:** at 0.82, real walks on rough concrete were 270–310 KB a still (33.1 MB for the 53 s Karsana walk). That's expensive mobile data for the foreman and fills storage fast.
- **Measured:** re-encoded the Karsana walk's 107 stills with Chrome's canvas encoder and re-counted every one with SAM 3.1:

  | Quality | Walk size | Confirmed | To check | SAM boxes, all frames |
  |---|---|---|---|---|
  | 0.82 (production run) | 33.1 MB | 372 | 45 | 5,004 |
  | 0.75 | 17.7 MB | 367 | 45 | 4,573 |
  | 0.70 | 16.3 MB | 360 | 51 | 4,618 |
  | 0.65 / 0.60 | 14.7 / 13.3 MB | not counted | | |

- **Decision:** 0.75. It halves the data and moves the confirmed count by about 1%. These stills were compressed twice (phone at 0.82, then again), which is harsher than a single encode on the phone, so this is the worst case.
- **Also restored after the storage move:** the Karsana (`vis_55dbb8c2d7d2`) and `vis_77d1c43227e3` reports, byte for byte from copies saved before the Blob pause. The Karsana site pin's coordinates weren't in the report, so that site is unpinned until its next located visit. The `vis_62077ef1a92a` and `vis_60c648d2e671` reports were only in Blob and are gone.

## 2026-11-01 — Replay attack on the live app

- **Test:** fed the stored Karsana walk (`vis_55dbb8c2d7d2`, paper code XKMX) to headless Chrome as its camera (`--use-file-for-fake-video-capture`) and walked it into a fresh visit on a new test site through the live foreman link.
- **Result:** `vis_7ef2922f3dfd`, **not verified**. Muse Spark read "XKMX" on frame 0 and the visit expected "47TU". SAM still counted 353 confirmed blocks, which is the point: the count alone proves nothing about when it was filmed.
- **Also seen:** from a desktop uplink, counting fell behind the walk (23 of 105 stills counted when the walk stopped, the rest during processing). On the phone walk over LTE it kept pace (107/107 at stop). Uploads, not SAM, are the bottleneck.

## 2026-11-01 — Muse Voice Transcribe is listed but not served; Spark 1.2 transcribes instead

- **Surprise:** `GET /v1/models` lists `muse-voice-transcribe-1.0`, but `POST /v1/audio/transcriptions` returns 404 with no body, and `/v1/responses` and `/v1/chat/completions` with that model say "The requested model was not found".
- **Path chosen:** `muse-spark-1.2` on `/v1/responses` with an `input_audio` part (base64 WAV) transcribes well. We used it to check the demo voiceover: split the take at its pauses, transcribed each of the 19 lines, matched them to the script, then cut each line back out of the finished video at its planned time and transcribed it again to prove placement.
- **Quirks:** on one clip Spark 1.2 replied that it couldn't access audio at all, and on another it declined a verbatim transcript because the audio named a place. Both passed on retry or by checking the level instead. Mishearings are phonetic ("Psalm 3.1" for SAM 3.1, "Kalsana" for Karsana).

## 2026-11-01 — Overlapping boxes mid-walk; a fix we measured and didn't ship

- **Surprise:** the stitched Karsana wall (`vis_55dbb8c2d7d2`) has a crowded middle stretch. Counting pairs of stitched blocks that overlap by more than 30% (IoU) gives about 40, all where the foreman stood further back (median block height fell from about 70 px to 42 px) and grass filled the lower half of each still. The shift between stills is measured on the whole frame, so grass in front and roofs behind, which slide at other speeds, can pull it off the wall.
- **Tried:** measure the shift on the band of rows that hold blocks only. Re-stitched four stored walks (`npm run replay`, same SAM output):

  | Walk | Confirmed / overlaps, whole frame | Confirmed / overlaps, wall band |
  |---|---|---|
  | Karsana 53 s | 373 / 41 | 359 / 28 |
  | Boundary wall 58 s | 235 / 11 | 220 / 3 |
  | Boundary wall 44 s | 239 / 34 | 258 / 31 |
  | Test clip 31 s | 225 / 4 | 226 / 4 |

- **Decision:** not shipped. Overlaps fell on two walks, but the 44 s walk's count rose by 19 with overlaps barely moving. Without a hand count of any of these walls we can't tell which version is closer to the truth, and changing the counter a few days before judging on a hunch would be worse than stating the limitation. It's in the README's limitations; a hand count of the Karsana wall decides it.

## 2026-11-01 — A fair estimate of the Karsana wall without a hand count

- **Why:** the report says 372 confirmed blocks for a wall nobody has hand-counted, and the overlapping boxes above suggest it runs high. Rather than leave "372" standing as the number, we estimated the real count from the stored walk (`vis_55dbb8c2d7d2`, 417 stitched blocks, 372 seen in 2+ stills).
- **Method A, merge likely duplicates:** union every pair of stitched boxes whose overlap is more than 30% of their union, or more than 60% of the smaller box. 417 stitched blocks became 357; 334 of those were seen in 2+ stills.
- **Method B, geometry:** median block 69 × 50 px on the stitched wall; wall extent 3,420 px, so about 47 blocks per row with a 6% joint allowance. Rows per slice of the wall (three blocks wide) ranged 4 to 9 where detection was dense (sparse slices undercount rows and were not trusted): median 7, mean 6.5. So 47 × 6.5 to 7 is about 305 to 330. Summing rows per slice naively gave 261, which we discarded because it undercounts wherever SAM misses a course.
- **Reading:** about 330, within 300 to 360, so the stitched 372 is about 10% high. That's the same direction the overlap count pointed, and it's small against a target of 100, so the verdict doesn't change. The product still reports 372 and says "confirmed", because that's what its rule produces; changing the counter on an estimate, days before judging, would be a guess dressed up as a fix.
- **Next:** a hand count of this wall replaces both methods with a measurement.

## 2026-11-01 — Hand count of the Karsana wall: 340

- **Result:** the builder hand-counted the wall on site: 340 blocks. The report's stitched and confirmed count is 372 (+9.4%); merging likely duplicates gives 357 (+5.0%) or 334 seen in 2+ stills (-1.8%); the geometry estimate made beforehand, about 330 (300 to 360), was 2.9% under and its range contained the true count.
- **Read:** the stitched count overshoots on this wall by about 9%, consistent with the overlap analysis above. It's one wall and one counter who also built the tool, so it's evidence of the size of the error, not a benchmark. The 31 s test clip's 225 and the other stored walks have no hand counts.
- **Decision:** the product keeps reporting its stitched count. Merging overlapping boxes would land within 5% here, but we tested a related change on four stored walks and it moved one of them the wrong way; with a single hand-counted wall we can't tell which direction generalises. Left as a limitation in the README.

